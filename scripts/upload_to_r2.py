#!/usr/bin/env python3
"""
Kőszeg és Vidéke – Cloudflare R2 automatikus PDF feltöltő script (Figyelő & Várakozó móddal + Perszisztens állapot).

Használat (előtte egyszer: npx wrangler login):
  python scripts/upload_to_r2.py --watch

FONTOS: a Wrangler 4 a `--remote` kapcsoló nélkül csak a gépen szimulálja az R2-t (.wrangler/state),
ezért a parancs mindig --remote-tal fut. A nyilvános címen (PUBLIC_BASE) már elérhető PDF-eket kihagyja.
"""

import argparse
import json
import os
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Windows UTF-8 & Telemetry fix
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["WRANGLER_SEND_METRICS"] = "false"
os.environ["CLOUDFLARE_TELEMETRY_DISABLED"] = "1"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "koszeg_es_videke_archive" / "pdf"
PUBLIC_BASE = os.environ.get("KEV_PDF_BASE", "https://pub-fc6c9d1807b047e1bbddb255e30b9c50.r2.dev")
AUTH_ERRORS = ("authenticated", "login", "api_token", "api token")


def is_online(name):
    """Elérhető-e már a PDF a nyilvános R2-címen."""
    req = urllib.request.Request(f"{PUBLIC_BASE}/{name}", headers={"User-Agent": "Mozilla/5.0", "Range": "bytes=0-7"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status in (200, 206) and r.read(8).startswith(b"%PDF")
    except Exception:
        return False


# Csak a --remote-tal ténylegesen feltöltött fájlok kerülnek bele (a régi, helyi „feltöltések” nem)
UPLOADED_CACHE_FILE = ROOT / "koszeg_es_videke_archive" / "index" / "r2_uploaded.json"


def load_uploaded_cache():
    if UPLOADED_CACHE_FILE.exists():
        try:
            return set(json.loads(UPLOADED_CACHE_FILE.read_text(encoding="utf-8")))
        except Exception:
            return set()
    return set()


def save_uploaded_cache(uploaded_set):
    UPLOADED_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    UPLOADED_CACHE_FILE.write_text(json.dumps(sorted(list(uploaded_set)), indent=1), encoding="utf-8")


def get_all_pdfs(skip_years=None):
    if skip_years is None:
        skip_years = set()
    else:
        skip_years = set(skip_years)

    pdfs = []
    for year_dir in sorted(PDF_DIR.glob("*")):
        if year_dir.is_dir():
            try:
                yr = int(year_dir.name)
                if yr in skip_years:
                    continue
            except ValueError:
                pass
            
            for pdf in sorted(year_dir.glob("*.pdf")):
                pdfs.append(pdf)
    return pdfs


def is_file_ready(file_path, wait_seconds=1):
    """Ellenőrzi, hogy a fájl letöltése befejeződött-e (nem változik a mérete)."""
    try:
        size1 = file_path.stat().st_size
        if size1 < 1000:  # 1 KB alatt gyanús
            return False
        time.sleep(wait_seconds)
        size2 = file_path.stat().st_size
        return size1 == size2
    except Exception:
        return False


def upload_with_wrangler(pdf_file, bucket_name, max_tries=3):
    remote_key = f"{bucket_name}/{pdf_file.name}"
    cmd = [
        "npx.cmd" if os.name == "nt" else "npx",
        "wrangler",
        "r2",
        "object",
        "put",
        remote_key,
        f"--file={pdf_file}",
        "--content-type=application/pdf",
        "--remote",
    ]

    env = dict(os.environ)
    env["WRANGLER_SEND_METRICS"] = "false"
    env["CLOUDFLARE_TELEMETRY_DISABLED"] = "1"

    last_err = "Ismeretlen hiba"
    for attempt in range(1, max_tries + 1):
        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
                check=True
            )
            return True, pdf_file.name, "OK"
        except subprocess.CalledProcessError as e:
            last_err = e.stderr.strip() if e.stderr else (e.stdout.strip() if e.stdout else str(e))
            if any(k in last_err.lower() for k in AUTH_ERRORS):
                return False, pdf_file.name, last_err
            time.sleep(1.5 * attempt)

    return False, pdf_file.name, last_err


def upload_with_boto3(pdf_file, bucket_name, s3_client):
    try:
        s3_client.upload_file(
            str(pdf_file),
            bucket_name,
            pdf_file.name,
            ExtraArgs={"ContentType": "application/pdf"}
        )
        return True, pdf_file.name, "OK"
    except Exception as e:
        return False, pdf_file.name, str(e)


def process_batch(pdf_files, args, uploaded_set, use_boto3, s3_client):
    pending = [p for p in pdf_files if p.name not in uploaded_set]
    if not pending:
        return 0, 0
    # ami már fent van a nyilvános címen, azt nem töltjük fel újra
    with ThreadPoolExecutor(16) as ex:
        online = {p.name for p, ok in zip(pending, ex.map(lambda p: is_online(p.name), pending)) if ok}
    uploaded_set |= online
    pending = [p for p in pending if p.name not in online]
    if not pending:
        return 0, 0

    print(f"\nÚj feltöltendő PDF-ek észlelve: {len(pending)} db (eddig feltöltve: {len(uploaded_set)} db)", flush=True)
    success_count = 0
    fail_count = 0

    if use_boto3:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {executor.submit(upload_with_boto3, pdf, args.bucket, s3_client): pdf for pdf in pending}
            for i, future in enumerate(as_completed(futures), 1):
                ok, fname, status = future.result()
                if ok:
                    success_count += 1
                    uploaded_set.add(fname)
                    save_uploaded_cache(uploaded_set)
                    print(f"[{i}/{len(pending)}] ✓ {fname}", flush=True)
                else:
                    fail_count += 1
                    print(f"[{i}/{len(pending)}] ✗ {fname} - Hiba: {status}", flush=True)
    else:
        # több Wrangler-feltöltés párhuzamosan (--workers, alapból 4): egyenként lassú a Wrangler indulása
        ready = [p for p in pending if is_file_ready(p, wait_seconds=0)]
        for p in pending:
            if p not in ready:
                print(f"⏳ {p.name} (még letöltés alatt...)", flush=True)
        lock = threading.Lock()
        auth_failed = threading.Event()

        def job(pdf):
            if auth_failed.is_set():
                return False, pdf.name, "kihagyva"
            return upload_with_wrangler(pdf, args.bucket)

        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = [executor.submit(job, pdf) for pdf in ready]
            for i, future in enumerate(as_completed(futures), 1):
                ok, fname, status = future.result()
                with lock:
                    if ok:
                        success_count += 1
                        uploaded_set.add(fname)
                        save_uploaded_cache(uploaded_set)
                        print(f"[{i}/{len(ready)}] ✓ {fname}", flush=True)
                    elif status != "kihagyva":
                        fail_count += 1
                        print(f"[{i}/{len(ready)}] ✗ {fname} - Hiba: {status}", flush=True)
                        if any(k in status.lower() for k in AUTH_ERRORS):
                            auth_failed.set()
        if auth_failed.is_set():
            print("\n⚠️ A Wrangler nincs bejelentkezve! Futtasd a parancssorban:", flush=True)
            print("   npx wrangler login", flush=True)
            sys.exit(2)

    return success_count, fail_count


def main():
    parser = argparse.ArgumentParser(description="Kőszeg és Vidéke PDF feltöltése Cloudflare R2 tárhelyre")
    parser.add_argument("--bucket", type=str, default="koszeg-archive", help="R2 bucket neve")
    parser.add_argument("--skip-years", nargs="*", type=int, default=[], help="Kihagyott évek (nem kötelező: a már fent lévőket magától kihagyja)")
    parser.add_argument("--only-years", nargs="*", type=int, default=[], help="Csak ezeknek az éveknek a feltöltése")
    parser.add_argument("--account-id", type=str, default=os.getenv("R2_ACCOUNT_ID"), help="Cloudflare Account ID (S3 API-hoz)")
    parser.add_argument("--access-key", type=str, default=os.getenv("R2_ACCESS_KEY_ID"), help="R2 Access Key ID")
    parser.add_argument("--secret-key", type=str, default=os.getenv("R2_SECRET_ACCESS_KEY"), help="R2 Secret Access Key")
    parser.add_argument("--workers", type=int, default=4, help="Párhuzamos feltöltések száma")
    parser.add_argument("--watch", action="store_true", help="Folyamatos figyelő mód (új letöltések bevárása)")
    parser.add_argument("--interval", type=int, default=5, help="Figyelési intervallum másodpercben (watch mód)")

    args = parser.parse_args()

    skip_set = set(args.skip_years)
    if args.only_years:
        all_dirs = [d.name for d in PDF_DIR.glob("*") if d.is_dir()]
        only_set = set(args.only_years)
        skip_set = {int(d) for d in all_dirs if d.isdigit() and int(d) not in only_set}

    print("=" * 60, flush=True)
    print("KŐSZEG ÉS VIDÉKE – CLOUDFLARE R2 PDF FELTÖLTŐ")
    print("=" * 60, flush=True)
    print(f"R2 Bucket:        {args.bucket}", flush=True)
    print(f"Mód:              {'FOLYAMATOS FIGYELŐ MÓD (--watch)' if args.watch else 'EGYSZERI'}", flush=True)
    print(f"Kihagyott évek:   {sorted(list(skip_set)) if skip_set else 'Nincs'}", flush=True)
    print("=" * 60, flush=True)

    use_boto3 = False
    s3_client = None

    if args.account_id and args.access_key and args.secret_key:
        try:
            import boto3
            endpoint_url = f"https://{args.account_id}.r2.cloudflarestorage.com"
            s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=args.access_key,
                aws_secret_access_key=args.secret_key,
                region_name="auto"
            )
            use_boto3 = True
            print("Mode: Direct S3 API (Boto3) - Párhuzamos gyors feltöltés", flush=True)
        except ImportError:
            print("boto3 csomag nem található, visszatérés Wrangler CLI módra...", flush=True)
        except Exception as e:
            print(f"Hiba a boto3 kliens inicializálásakor: {e}", flush=True)

    if not use_boto3:
        print("Mode: Wrangler CLI (npx wrangler r2 object put)\n", flush=True)

    uploaded_set = load_uploaded_cache()
    if uploaded_set:
        print(f"ℹ️ Korábban feltöltött fájlok betöltve a gyorsítótárból: {len(uploaded_set)} db", flush=True)

    if args.watch:
        print(f"🔍 Figyelő mód elindítva... ({args.interval} másodpercenként ellenőrzi az új PDF-eket)\n", flush=True)
        try:
            while True:
                pdf_files = get_all_pdfs(skip_years=skip_set)
                process_batch(pdf_files, args, uploaded_set, use_boto3, s3_client)
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nFigyelő mód leállítva.", flush=True)
    else:
        pdf_files = get_all_pdfs(skip_years=skip_set)
        if not pdf_files:
            print("Nincs feltöltendő PDF fájl.", flush=True)
            return
        process_batch(pdf_files, args, uploaded_set, use_boto3, s3_client)


if __name__ == "__main__":
    main()
