#!/usr/bin/env python3
"""
Kőszeg és Vidéke – a koszeg.hu régi (2012 decembere előtti) havi lapszámai.

A koszeg.hu-n nincs listájuk; a fájlok neve kev_ééééhhnn.pdf, két mappában:
  https://koszeg.hu/downloads/downloadmanager/47/121/   (kb. 2008–2009)
  https://koszeg.hu/pictures/downloadmanager/47/121/    (kb. 2010–2012)
A megjelenés napja lapszámonként más, ezért a script havonta végigpróbálja a napokat
(kíméletesen: HEAD-kérés, kevés párhuzamos szál), és amit talál, letölti.

  python scripts/download_koszeg_old.py --from 2008 --to 2012

Eredmény: koszeg_es_videke_archive/pdf/<év>/kev_<ééééhhnn>.pdf, processed/<stem>.json,
index/koszeg_old.json (a build_site_data.py olvassa).
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pymupdf

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
ARCH = ROOT / "koszeg_es_videke_archive"
INDEX = ARCH / "index" / "koszeg_old.json"
BASES = [
    "https://koszeg.hu/downloads/downloadmanager/47/121",
    "https://koszeg.hu/pictures/downloadmanager/47/121",
]
UA = {"User-Agent": "Mozilla/5.0 (KoszegEsVideke-archivum)"}
LAST = (2012, 11)  # 2012 decemberétől a mostani (index/issues.json) gyűjtés tart


def exists(url):
    # HEAD: a nem létező fájlnál sem jön le a hibaoldal törzse
    req = urllib.request.Request(url, headers=UA, method="HEAD")
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status == 200 and "pdf" in r.headers.get("Content-Type", "")
        except urllib.error.HTTPError as e:
            if e.code in (403, 404):
                return False
        except Exception:
            pass
        time.sleep(2 * (i + 1))
    return False


def safe_replace(tmp, dst):
    # a feltöltő épp olvashatja a fájlt (Windows-zárolás): várunk és újrapróbáljuk
    for i in range(60):
        try:
            tmp.replace(dst)
            return
        except PermissionError:
            time.sleep(2)
    raise PermissionError(f"nem cserélhető: {dst}")


def fetch(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
                return r.read()
        except Exception:
            time.sleep(5 * (i + 1))
    return None


def clean_text(t):
    t = t.replace("\xa0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def find_month(y, m):
    """Az adott hónap lapszáma(i): minden nap, mindkét mappa."""
    cands = [(d, f"{b}/kev_{y:04d}{m:02d}{d:02d}.pdf") for d in range(1, 32) for b in BASES]
    with ThreadPoolExecutor(6) as ex:
        ok = list(ex.map(lambda c: exists(c[1]), cands))
    found = {}
    for (d, url), hit in zip(cands, ok):
        if hit and d not in found:
            found[d] = url
    return sorted(found.items())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="y0", type=int, default=2008)
    ap.add_argument("--to", dest="y1", type=int, default=2012)
    args = ap.parse_args()

    index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else []
    known = {it["filename"]: it for it in index}
    (ARCH / "processed").mkdir(exist_ok=True)

    for y in range(args.y0, args.y1 + 1):
        got = 0
        for m in range(1, 13):
            if (y, m) > LAST:
                break
            for d, url in find_month(y, m):
                stem = f"kev_{y:04d}{m:02d}{d:02d}"
                dst = ARCH / "pdf" / str(y) / f"{stem}.pdf"
                dst.parent.mkdir(parents=True, exist_ok=True)
                doc = None
                for attempt in range(2):
                    if attempt or not dst.exists() or dst.stat().st_size < 10000:
                        data = fetch(url)
                        if not data or not data.startswith(b"%PDF"):
                            break
                        tmp = dst.with_suffix(".pdf.part")
                        tmp.write_bytes(data)
                        safe_replace(tmp, dst)
                    try:
                        doc = pymupdf.open(dst)
                        break
                    except Exception:
                        doc = None
                if doc is None:
                    print(f"  HIBA (sérült/nem PDF): {url}")
                    continue
                pages = [{"page": i + 1, "text": clean_text(p.get_text("text"))} for i, p in enumerate(doc)]
                doc.close()
                for p in pages:
                    p["characters"] = len(p["text"])
                head = " ".join(p["text"] for p in pages[:2]).replace("\n", " ")
                mm = re.search(r"([IVXLC]+)\.\s*ÉVFOLYAM,?\s*(\d+)\.\s*SZÁM", head, re.I)
                (ARCH / "processed" / f"{stem}.json").write_text(json.dumps({
                    "source_file": dst.name, "year": y, "month": m, "day": d,
                    "publication_date": f"{y:04d}-{m:02d}-{d:02d}",
                    "page_count": len(pages), "total_characters": sum(p["characters"] for p in pages),
                    "source": "koszeg.hu", "pages": pages,
                }, ensure_ascii=False, indent=1), encoding="utf-8")
                known[dst.name] = {
                    "filename": dst.name, "date": f"{y:04d}-{m:02d}-{d:02d}", "year": y, "month": m, "day": d,
                    "volume": mm.group(1).upper() if mm else None, "number": int(mm.group(2)) if mm else None,
                    "url": url, "size_bytes": dst.stat().st_size, "pages": len(pages),
                }
                got += 1
                print(f"  {dst.name}  {dst.stat().st_size / 1e6:.1f} MB  {len(pages)} oldal", flush=True)
            INDEX.write_text(json.dumps(sorted(known.values(), key=lambda x: x["date"]), ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"Kész: {y} – {got} lapszám", flush=True)


if __name__ == "__main__":
    main()
