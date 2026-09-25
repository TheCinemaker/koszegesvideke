#!/usr/bin/env python3
"""
Kőszeg és Vidéke 1889–1939: a Chernel Kálmán Városi Könyvtár digitalizált évfolyamainak letöltése.
Forrás: http://www.koszeg-konyvtar.hu/node/77

Egy futás = egy évfolyam (kíméletesen: egyesével, szünetekkel, újrapróbálkozással; a meglévőt kihagyja).
  python scripts/download_konyvtar.py --year 1889

Eredmény:
  koszeg_es_videke_archive/pdf/<év>/kev_<ééééhhnn>.pdf       – a PDF-ek (a Cloudflare R2-be ezeket kell feltölteni)
  koszeg_es_videke_archive/processed/kev_<ééééhhnn>.json     – oldalankénti szöveg (OCR-réteg) a keresőhöz
  koszeg_es_videke_archive/index/konyvtar.json              – lapszámlista (dátum, szám, forrás-URL, méret)
"""

import argparse
import hashlib
import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

import pymupdf

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
ARCH = ROOT / "koszeg_es_videke_archive"
INDEX = ARCH / "index" / "konyvtar.json"
BASE = "http://www.koszeg-konyvtar.hu"
LIST_PAGE = f"{BASE}/node/77"
UA = {"User-Agent": "Mozilla/5.0 (KoszegEsVideke-archivum; kapcsolat: kamansn@t-online.hu)"}
PAUSE = 1.5  # másodperc két letöltés között – ne terheljük a könyvtár szerverét


def fetch(url, binary=False, tries=4):
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "replace")
        except Exception as e:  # hálózati hiba: várunk, újra
            last = e
            time.sleep(5 * (i + 1))
    raise RuntimeError(f"nem sikerült: {url} ({last})")


def year_pages():
    page = fetch(LIST_PAGE)
    out = {}
    for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', page, re.S):
        text = html.unescape(re.sub("<[^>]+>", "", m.group(2))).strip()
        mm = re.match(r"Kőszeg és Vidéke (\d{4})\. évfolyam", text)
        if mm:
            out[int(mm.group(1))] = m.group(1)
    return out


def clean_text(t):
    t = t.replace("\xa0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def issue_number(first_page_text):
    # "IX-ik évfolyam. 1-ső szám." / "1. szám"
    m = re.search(r"(\d{1,3})\s*[-.]?\s*(?:ik|ső|dik|od|ed|öd|ad)?\.?\s*sz[áa]m", first_page_text, re.I)
    return int(m.group(1)) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, required=True)
    args = ap.parse_args()
    year = args.year

    years = year_pages()
    if year not in years:
        sys.exit(f"Nincs ilyen évfolyam a könyvtár oldalán: {year} (elérhető: {min(years)}–{max(years)})")
    listing = fetch(years[year])
    pdfs = sorted(set(re.findall(r'href="([^"]+\.pdf)"', listing)))
    print(f"{year}: {len(pdfs)} lapszám")

    index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else []
    known = {it["filename"]: it for it in index}
    pdf_dir = ARCH / "pdf" / str(year)
    pdf_dir.mkdir(parents=True, exist_ok=True)
    (ARCH / "processed").mkdir(exist_ok=True)

    for n, url in enumerate(pdfs, 1):
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})(_\d+)?\.pdf$", url)
        if not m:
            print("  kihagyva (nem dátum-fájlnév):", url)
            continue
        y, mo, d = map(int, m.groups()[:3])
        stem = f"kev_{y:04d}{mo:02d}{d:02d}"
        if m.group(4):
            # ugyanarra a napra második fájl ("…_0.pdf"): ha azonos a főlappal, kihagyjuk; ha eltér (melléklet), külön mentjük
            data = fetch(url, binary=True)
            base = pdf_dir / f"{stem}.pdf"
            if base.exists() and hashlib.md5(base.read_bytes()).hexdigest() == hashlib.md5(data).hexdigest():
                print("  kihagyva (azonos másolat):", url)
                time.sleep(PAUSE)
                continue
            stem = f"{stem}_b"
            (pdf_dir / f"{stem}.pdf").write_bytes(data)
            time.sleep(PAUSE)
        dst = pdf_dir / f"{stem}.pdf"
        if not dst.exists() or dst.stat().st_size < 10000:
            data = fetch(url, binary=True)
            if not data.startswith(b"%PDF"):
                print("  HIBA (nem PDF):", url)
                continue
            dst.write_bytes(data)
            time.sleep(PAUSE)

        doc = pymupdf.open(dst)
        pages = [{"page": i + 1, "text": clean_text(p.get_text("text"))} for i, p in enumerate(doc)]
        doc.close()
        for p in pages:
            p["characters"] = len(p["text"])
        num = issue_number(pages[0]["text"][:400]) if pages else None
        (ARCH / "processed" / f"{stem}.json").write_text(json.dumps({
            "source_file": dst.name, "year": y, "month": mo, "day": d,
            "publication_date": f"{y:04d}-{mo:02d}-{d:02d}", "issue_number": num,
            "page_count": len(pages), "total_characters": sum(p["characters"] for p in pages),
            "source": "Chernel Kálmán Városi Könyvtár", "pages": pages,
        }, ensure_ascii=False, indent=1), encoding="utf-8")

        known[dst.name] = {
            "filename": dst.name, "date": f"{y:04d}-{mo:02d}-{d:02d}", "year": y, "month": mo, "day": d,
            "issue_number": num, "url": url if url.startswith("http") else BASE + url,
            "local_path": str(dst.relative_to(ROOT)), "size_bytes": dst.stat().st_size, "pages": len(pages),
            "source": "Chernel Kálmán Városi Könyvtár",
        }
        print(f"  {n:2d}/{len(pdfs)} {dst.name}  {dst.stat().st_size / 1e6:.1f} MB  {len(pages)} oldal  {num or '?'}. szám")

    # hiányzó (OCR-ből nem olvasható) lapszám-sorszám pótlása a szomszédokból
    same_year = sorted((v for v in known.values() if v["year"] == year), key=lambda x: x["date"])
    for i, v in enumerate(same_year):
        if v["issue_number"] is None:
            prev = same_year[i - 1]["issue_number"] if i > 0 else None
            nxt = same_year[i + 1]["issue_number"] if i + 1 < len(same_year) else None
            if prev is not None and (nxt is None or nxt - prev == 2):
                v["issue_number"] = prev + 1
            elif nxt is not None and prev is None:
                v["issue_number"] = nxt - 1
    INDEX.write_text(json.dumps(sorted(known.values(), key=lambda x: x["date"]), ensure_ascii=False, indent=1), encoding="utf-8")
    got = [v for v in known.values() if v["year"] == year]
    print(f"Kész: {year} – {len(got)} lapszám, {sum(v['size_bytes'] for v in got) / 1e6:.0f} MB → {pdf_dir.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
