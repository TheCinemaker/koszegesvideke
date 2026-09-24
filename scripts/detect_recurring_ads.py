#!/usr/bin/env python3
"""
Ismétlődő hirdetések felismerése képtartalom-ujjlenyomat alapján.

Egy hirdetés általában több lapszámban is ugyanazzal a raszterképpel jelenik meg, míg a riportfotók
egyediek. A 2025-ös és 2026-os lapszámok beágyazott képeinek MD5-ujjlenyomatát összevetjük: ami legalább
két különböző lapszámban előfordul, azt hirdetésnek (vagy ismétlődő grafikai elemnek) tekintjük.

Kimenet: koszeg_es_videke_archive/articles_2026/recurring_ads.json
  { "<stem>": { "<oldal>": [<képegység indexe>, ...] } }  – a segment_2026.py képegységeinek indexei
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

import pymupdf

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "koszeg_es_videke_archive" / "pdf"
AUTO_DIR = ROOT / "koszeg_es_videke_archive" / "articles_2026"


def raw_images(pdf):
    doc = pymupdf.open(pdf)
    out = []
    for pno, page in enumerate(doc):
        for info in page.get_image_info(hashes=True):
            b = info["bbox"]
            if (b[2] - b[0]) < 40 or (b[3] - b[1]) < 40:
                continue
            out.append((pno + 1, list(b), info["digest"].hex() if info.get("digest") else None))
    doc.close()
    return out


def main():
    pdfs = sorted((PDF_DIR / "2025").glob("*.pdf")) + sorted((PDF_DIR / "2026").glob("*.pdf"))
    per_pdf = {}
    seen_in = defaultdict(set)
    for pdf in pdfs:
        imgs = raw_images(pdf)
        per_pdf[pdf.stem] = imgs
        for _, _, dg in imgs:
            if dg:
                seen_in[dg].add(pdf.stem)
        print(f"{pdf.stem}: {len(imgs)} kép", flush=True)

    result = {}
    for auto in sorted(AUTO_DIR.glob("kev_2026*.auto.json")):
        data = json.loads(auto.read_text(encoding="utf-8"))
        stem = data["stem"]
        ads = defaultdict(list)
        for pg in data["pages"]:
            pno = pg["page"]
            raws = [(b, dg and len(seen_in[dg]) >= 2) for (pn, b, dg) in per_pdf.get(stem, []) if pn == pno]
            for im in pg["images"]:
                ub = im["bbox"]
                uarea = max(1.0, (ub[2] - ub[0]) * (ub[3] - ub[1]))
                recurring_fit, unique_photo = False, False
                for b, is_rec in raws:
                    barea = max(1.0, (b[2] - b[0]) * (b[3] - b[1]))
                    ix = max(0, min(b[2], ub[2]) - max(b[0], ub[0]))
                    iy = max(0, min(b[3], ub[3]) - max(b[1], ub[1]))
                    inter = ix * iy
                    if barea > 2 * uarea:
                        continue  # page background / tint behind the unit
                    iou = inter / (uarea + barea - inter)
                    if is_rec and iou >= 0.5:
                        recurring_fit = True
                    if not is_rec and inter / uarea >= 0.3:
                        unique_photo = True
                if recurring_fit and not unique_photo:
                    ads[str(pno)].append(im["idx"])
        result[stem] = dict(ads)
        print(stem, sum(len(v) for v in ads.values()), "ismétlődő hirdetéskép")
    (AUTO_DIR / "recurring_ads.json").write_text(json.dumps(result, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
