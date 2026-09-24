#!/usr/bin/env python3
"""
Kőszeg és Vidéke – 2026-os lapszámok cikkekre bontása (1. lépés: automatikus szegmentálás).

A PDF-ek tördelési jellemzői (2026, Clearface Gothic betűcsalád):
  * törzsszöveg:   ~10 pt Light, szín #231f20; idézet: 9 pt Italic
  * cikkcím:       20–24 pt Bold, kék (#154e87) – sportoldalon 14–16 pt Bold fekete
  * alcím (deck):  14–17 pt Bold közvetlenül a cím alatt
  * közcím:        10 pt Medium rövid sor a szövegben
  * rovatcím:      függőleges felirat az oldalsávban (VÁROSHÁZA, AKTUÁLIS …)
  * hirdetések:    raszterképek és/vagy színes, nem szerkesztőségi betűk

Kimenet: koszeg_es_videke_archive/articles_2026/<stem>.auto.json
         (és opcionálisan ellenőrző képek: --overlay <mappa>)
A kézi javításokat a curation.json tartalmazza, a végső adatot build_site_data.py állítja elő.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import pymupdf

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "koszeg_es_videke_archive" / "pdf" / "2026"
OUT_DIR = ROOT / "koszeg_es_videke_archive" / "articles_2026"

EDITORIAL_COLORS = {0x231F20, 0x154E87, 0x000000, 0xCFB284}
HEAD_COLORS = {0x231F20, 0x154E87, 0x000000, 0xCFB284}


def is_clearface(font):
    return font.startswith("ClearfaceGothic")


def span_style(spans):
    """Dominant span of a line (by character count)."""
    return max(spans, key=lambda s: len(s["text"].strip()))


def rect_area(r):
    return max(0, r[2] - r[0]) * max(0, r[3] - r[1])


def intersect(a, b):
    return (max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3]))


def overlap_ratio(a, b):
    """Share of a's area covered by b."""
    ar = rect_area(a)
    return rect_area(intersect(a, b)) / ar if ar else 0


def center_in(line_bbox, r, pad=0):
    cx = (line_bbox[0] + line_bbox[2]) / 2
    cy = (line_bbox[1] + line_bbox[3]) / 2
    return r[0] - pad <= cx <= r[2] + pad and r[1] - pad <= cy <= r[3] + pad


def merge_image_boxes(boxes):
    """Merge overlapping / touching image rectangles into visual units."""
    boxes = [list(b) for b in boxes]
    changed = True
    while changed:
        changed = False
        out = []
        while boxes:
            a = boxes.pop()
            i = 0
            while i < len(boxes):
                b = boxes[i]
                inter = rect_area(intersect(a, b))
                if inter > 0.3 * min(rect_area(a), rect_area(b)):
                    a = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    boxes.pop(i)
                    changed = True
                else:
                    i += 1
            out.append(a)
        boxes = out
    return boxes


def body_chars_inside(page_lines, r):
    return sum(len(t) for (bb, t) in page_lines if center_in(bb, r, pad=-1))


def page_images(page, body_lines):
    """Visual image units. body_lines: [(bbox, text)] of plain body text used to reject tint/background images."""
    W, H = page.rect.width, page.rect.height
    raw = []
    for info in page.get_image_info(xrefs=True):
        b = [max(0, info["bbox"][0]), max(0, info["bbox"][1]), min(W, info["bbox"][2]), min(H, info["bbox"][3])]
        w, h = b[2] - b[0], b[3] - b[1]
        if w < 40 or h < 40:
            continue  # rules, sidebar strips
        if w * h > 0.8 * W * H:
            continue  # full-page background
        if body_chars_inside(body_lines, b) > 150:
            continue  # background / tint behind running text
        raw.append(b)
    return merge_image_boxes(raw)


def tinted_boxes(page):
    W, H = page.rect.width, page.rect.height
    out = []
    for d in page.get_drawings():
        f = d.get("fill")
        r = d["rect"]
        if not f or r.width * r.height < 6000 or r.width * r.height > 0.6 * W * H:
            continue
        if r.width < 40 or r.x0 < 5 and r.width < 40:
            continue
        if min(f) > 0.97:  # white
            continue
        out.append([r.x0, r.y0, r.x1, r.y1])
    return out


def plain_body_lines(page):
    res = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"]:
            continue
        for l in b["lines"]:
            sp = [s for s in l["spans"] if s["text"].strip()]
            if not sp:
                continue
            st = span_style(sp)
            if st["size"] < 11.5 and st["color"] == 0x231F20 and is_clearface(st["font"]):
                res.append((l["bbox"], "".join(s["text"] for s in sp)))
    return res


def collect_lines(page, images, pno):
    """Return (lines, section_labels). Each line: dict with text/bbox/size/font/color/kind/block."""
    W = page.rect.width
    d = page.get_text("dict", sort=False)
    labels = []
    lines = []
    order = 0
    for bi, b in enumerate(d["blocks"]):
        if b["type"] != 0:
            continue
        blines = []
        for l in b["lines"]:
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            txt = "".join(s["text"] for s in l["spans"]).replace("\xa0", " ")
            if not txt.strip():
                continue
            st = span_style(spans)
            x0, y0, x1, y1 = l["bbox"]
            if abs(l["dir"][1]) > 0.5:  # vertical text = section label in the sidebar
                if x0 < 40 or x1 > W - 40:
                    labels.append(txt.strip())
                continue
            if y1 < 45:  # running header
                continue
            if y0 > 780 and txt.strip().isdigit():  # page number
                continue
            editorial_chars = sum(len(s["text"]) for s in spans if is_clearface(s["font"]) and s["color"] in EDITORIAL_COLORS)
            total_chars = sum(len(s["text"]) for s in spans)
            blines.append({
                "text": txt,
                "bbox": [round(v, 1) for v in l["bbox"]],
                "size": round(st["size"], 1),
                "font": st["font"],
                "color": st["color"],
                "bold": "Bold" in st["font"] or "Black" in st["font"],
                "medium": "Medi" in st["font"] or "Demi" in st["font"],
                "italic": "Italic" in st["font"] or "Ital" in st["font"],
                "editorial": total_chars and editorial_chars / total_chars >= 0.6,
                "block": bi,
                "order": order,
            })
            order += 1
        if not blines:
            continue
        # a block that is mostly non-editorial (ads) is dropped entirely
        ed = sum(len(x["text"]) for x in blines if x["editorial"])
        tot = sum(len(x["text"]) for x in blines)
        if pno == 0:
            # cover: keep editorial lines and the white headline; drop the rest of the block
            blines = [x for x in blines if x["editorial"] or (x["color"] == 0xFFFFFF and x["size"] >= 18)]
        elif tot and ed / tot < 0.6:
            continue
        lines.extend(blines)

    kept = []
    for ln in lines:
        # text printed over a raster image belongs to an ad (captions are outside the photos)
        if any(center_in(ln["bbox"], im, pad=-1) for im in images) and not (pno == 0 and ln["color"] == 0xFFFFFF):
            ln["in_image"] = True
            kept.append(ln)  # keep for now – decided later (ad vs. photo)
            continue
        ln["in_image"] = False
        kept.append(ln)
    return kept, labels


def classify(lines, pno):
    for ln in lines:
        t = ln["text"].strip()
        if pno == 0 and ln["size"] >= 18 and ln["color"] == 0xFFFFFF and ln["bbox"][1] > 600:
            ln["kind"] = "head"
        elif pno == 0 and ln["color"] == 0xCFB284 and ln["size"] >= 14:
            ln["kind"] = "kicker"
        elif pno == 0 and ln["color"] == 0xFFFFFF:
            ln["kind"] = "skip"  # masthead strip on the cover
        elif ln["size"] >= 17.5 and (ln["bold"] or ln["color"] == 0x154E87) and ln["color"] in HEAD_COLORS:
            ln["kind"] = "head"
        elif 13.5 <= ln["size"] < 17.5 and (ln["bold"] or ln["medium"]) and ln["color"] in HEAD_COLORS and len(t) > 2:
            ln["kind"] = "head2"  # deck under a big title, or title of a short sport item
        elif ln["size"] < 11.5:
            ln["kind"] = "body"
        else:
            ln["kind"] = "other"
    return lines


def merge_heads(lines):
    """Merge consecutive heading lines of the same style into one heading item."""
    items = []
    for ln in lines:
        if items and ln["kind"] in ("head", "head2", "kicker") and items[-1]["kind"] == ln["kind"]:
            prev = items[-1]
            pb = prev["bbox"]
            if abs(ln["size"] - prev["size"]) < 1.5 and -8 <= ln["bbox"][1] - pb[3] < ln["size"] * 1.2 and not (ln["bbox"][0] > pb[2] or pb[0] > ln["bbox"][2]):
                prev["text"] = prev["text"].rstrip() + " " + ln["text"].strip()
                prev["bbox"] = [min(pb[0], ln["bbox"][0]), pb[1], max(pb[2], ln["bbox"][2]), ln["bbox"][3]]
                continue
        items.append(dict(ln))
    return items


def segment_page(items):
    """Group items into stories using content-stream order (InDesign keeps a story's frames together)."""
    stories = []
    cur = None
    pending = []  # body lines seen before any heading on the page

    def new_story(head):
        return {"title": head["text"].strip(), "title_bbox": head["bbox"], "title_size": head["size"],
                "deck": [], "lines": [], "kicker": None}

    for it in items:
        k = it["kind"]
        if k == "skip" or k == "other":
            continue
        if k == "kicker":
            if cur is not None and not cur["lines"]:
                cur["kicker"] = it["text"].strip()
            else:
                pending_kicker = it["text"].strip()
                stories.append({"title": None, "kicker_only": pending_kicker})
            continue
        if k == "head":
            cur = new_story(it)
            stories.append(cur)
            continue
        if k == "head2":
            # a deck directly below a big title?
            if cur is not None and not cur["lines"] and cur["title_size"] >= 17.5 and it["bbox"][1] - cur["title_bbox"][3] < 60:
                cur["deck"].append(it["text"].strip())
                continue
            cur = new_story(it)
            stories.append(cur)
            continue
        # body
        if cur is None:
            pending.append(it)
        else:
            cur["lines"].append(it)

    stories = [s for s in stories if s.get("title") is not None or s.get("kicker_only")]
    # kicker-only placeholders: attach to the next/prev titled story (cover page)
    real = [s for s in stories if s.get("title")]
    kick = [s["kicker_only"] for s in stories if s.get("kicker_only")]
    if kick and real:
        real[0]["kicker"] = kick[0]
    stories = real

    if pending:
        # headings emitted after their text (e.g. the cover story): give orphans to a story without text
        empty = [s for s in stories if not s["lines"]]
        if empty:
            empty[0]["lines"] = pending + empty[0]["lines"]
        else:
            stories.insert(0, {"title": None, "title_bbox": None, "title_size": 0, "deck": [], "lines": pending,
                               "kicker": None, "orphan": True})
    return stories


def _xover(a, b):
    return min(a[2], b[2]) - max(a[0], b[0])


def _yover(a, b):
    return min(a[3], b[3]) - max(a[1], b[1])


def segment_page_geo(items):
    """
    Geometric story assignment (inner pages). The content-stream order of the PDF is not reliable
    (a title may be written after its text, frames of neighbouring stories interleave), so:
      1. every text unit (a PDF block split into columns) belongs to the nearest title above it in its column;
      2. a unit with no title above in its column continues the story of the column to its left
         in the same vertical band (text flowing into the next column);
      3. units above every title are the continuation of a story from the previous page (orphan).
    """
    heads = [it for it in items if it["kind"] in ("head", "head2")]
    body = [it for it in items if it["kind"] == "body"]

    # decks: a smaller bold line directly below a big title
    titles, decks = [], {}
    for h in sorted(heads, key=lambda h: h["bbox"][1]):
        if h["kind"] == "head2":
            parent = None
            for t in titles:
                tb = t["bbox"]
                if t["size"] >= 17.5 and 0 <= h["bbox"][1] - tb[3] < 60 and _xover(h["bbox"], tb) > 0:
                    parent = t
            if parent is not None and not any(b["bbox"][1] > parent["bbox"][3] and b["bbox"][3] < h["bbox"][1] and _xover(b["bbox"], h["bbox"]) > 0 for b in body):
                decks.setdefault(id(parent), []).append(h["text"].strip())
                continue
        titles.append(h)

    stories = [{"title": t["text"].strip(), "title_bbox": t["bbox"], "title_size": t["size"],
                "deck": decks.get(id(t), []), "lines": [], "kicker": None} for t in titles]

    # units: PDF block split into columns
    units = []
    by_block = {}
    for l in body:
        by_block.setdefault(l["block"], []).append(l)
    for blines in by_block.values():
        cols = []
        for l in sorted(blines, key=lambda l: (l["bbox"][1], l["bbox"][0])):
            for c in cols:
                w = min(l["bbox"][2] - l["bbox"][0], c["bbox"][2] - c["bbox"][0])
                if _xover(l["bbox"], c["bbox"]) > 0.5 * max(w, 1):
                    c["lines"].append(l)
                    c["bbox"] = [min(c["bbox"][0], l["bbox"][0]), min(c["bbox"][1], l["bbox"][1]),
                                 max(c["bbox"][2], l["bbox"][2]), max(c["bbox"][3], l["bbox"][3])]
                    break
            else:
                cols.append({"lines": [l], "bbox": list(l["bbox"])})
        units.extend(cols)

    owner = {}
    # 1. nearest title above in the same column
    for ui, u in enumerate(units):
        ub = u["bbox"]
        best = None
        for si, st in enumerate(stories):
            tb = st["title_bbox"]
            if tb[1] <= ub[1] + 2 and _xover(ub, tb) > 0:
                if best is None or tb[1] > stories[best]["title_bbox"][1]:
                    best = si
        if best is not None:
            owner[ui] = best

    # 2. continuation from the column on the left (repeat until stable)
    changed = True
    while changed:
        changed = False
        for ui in sorted(range(len(units)), key=lambda i: units[i]["bbox"][0]):
            if ui in owner:
                continue
            ub = units[ui]["bbox"]
            best, best_ov = None, 0
            for vi, v in enumerate(units):
                if vi not in owner or vi == ui:
                    continue
                vb = v["bbox"]
                if vb[2] <= ub[0] + 10:
                    ov = _yover(ub, vb)
                    if ov > best_ov or (ov == best_ov and best is not None and vb[2] > units[best]["bbox"][2]):
                        best, best_ov = vi, ov
            if best is not None and best_ov > 0:
                owner[ui] = owner[best]
                changed = True

    # 3. leftovers: continuation of the previous page's story, or nearest title
    orphan = None
    for ui, u in enumerate(units):
        if ui in owner:
            continue
        ub = u["bbox"]
        above = [si for si, st in enumerate(stories) if st["title_bbox"] and st["title_bbox"][1] <= ub[1] + 2]
        if not above:
            if orphan is None:
                stories.insert(0, {"title": None, "title_bbox": None, "title_size": 0, "deck": [], "lines": [],
                                   "kicker": None, "orphan": True})
                owner = {k: v + 1 for k, v in owner.items()}
                orphan = 0
            owner[ui] = orphan
        else:
            def score(si):
                tb = stories[si]["title_bbox"]
                return (ub[1] - tb[3]) + 3 * max(0, tb[0] - ub[2], ub[0] - tb[2])
            owner[ui] = min(above, key=score)
    # orphan units may have neighbours on their right that step 2 could not reach before
    for ui, u in enumerate(units):
        stories[owner[ui]].setdefault("units", []).append(u)

    # reading order inside a story: column by column, top to bottom
    for st in stories:
        us = st.pop("units", [])
        us.sort(key=lambda u: (round(u["bbox"][0] / 40), u["bbox"][1]))
        st["lines"] = [l for u in us for l in sorted(u["lines"], key=lambda l: (l["bbox"][1], l["bbox"][0]))]
    return [st for st in stories if st["lines"] or st.get("title")]


def split_boxes(stories, boxes):
    """Lines inside a tinted box that does not contain the story title form a separate 'box' unit."""
    out = []
    for s in stories:
        out.append(s)
        for bx in boxes:
            if s.get("title_bbox") and center_in(s["title_bbox"], bx):
                continue
            inside = [l for l in s["lines"] if center_in(l["bbox"], bx)]
            if inside and len(inside) < len(s["lines"]):
                s["lines"] = [l for l in s["lines"] if not center_in(l["bbox"], bx)]
                out.append({"title": None, "title_bbox": None, "title_size": 0, "deck": [], "lines": inside,
                            "kicker": None, "box": True})
            elif inside and s.get("orphan"):
                s["box"] = True
    return out


def is_impressum(s):
    txt = " ".join(l["text"] for l in s["lines"])
    return "ISSN" in txt and "Felelős kiadó" in txt


def story_bbox(s):
    boxes = [l["bbox"] for l in s["lines"]]
    if s.get("title_bbox"):
        boxes.append(s["title_bbox"])
    if not boxes:
        return None
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]


def assign_images(stories, images, lines_in_images):
    """Assign each image unit to the closest story; images carrying overlaid ad text are ads."""
    result = []
    for idx, im in enumerate(images):
        overlay = [l for l in lines_in_images if center_in(l["bbox"], im, pad=-1)]
        overlay_chars = sum(len(l["text"].strip()) for l in overlay)
        best, best_d = None, 1e9
        for si, s in enumerate(stories):
            bb = s.get("bbox")
            if not bb:
                continue
            # distance between rectangles
            dx = max(0, bb[0] - im[2], im[0] - bb[2])
            dy = max(0, bb[1] - im[3], im[1] - bb[3])
            dist = (dx ** 2 + dy ** 2) ** 0.5
            # prefer stories sharing horizontal extent
            xo = min(bb[2], im[2]) - max(bb[0], im[0])
            if xo < 0:
                dist += 40
            if dist < best_d:
                best, best_d = si, dist
        result.append({"idx": idx, "bbox": [round(v, 1) for v in im], "story": best, "dist": round(best_d, 1),
                       "overlay_chars": overlay_chars,
                       "ad_guess": overlay_chars > 25 or best is None})
    return result


def extract_caption(stories, images):
    """Italic / small lines directly below a photo (chained line by line) and within its width are its caption."""
    for im in images:
        b = im["bbox"]
        cand = []
        for s in stories:
            for l in s["lines"]:
                lb = l["bbox"]
                w = max(1, lb[2] - lb[0])
                xo = min(lb[2], b[2]) - max(lb[0], b[0])
                if l["text"].strip()[:1] in "–-—":
                    continue  # interview question, not a caption
                if xo / w >= 0.6 and (l["italic"] or l["size"] < 9.6) and lb[1] >= b[3] - 2:
                    cand.append((lb[1], l, s))
        cand.sort(key=lambda x: x[0])
        caps, bottom = [], b[3]
        for y, l, s in cand:
            if y - bottom > 13 or len(caps) >= 5:
                break
            if y - bottom < -2:
                continue
            caps.append((l, s))
            bottom = l["bbox"][3]
        if caps:
            for l, s in caps:
                s["lines"] = [x for x in s["lines"] if x is not l]
            im["caption"] = " ".join(l["text"].strip() for l, _ in caps)


def fix_misplaced_lines(stories):
    """Content-stream order is not always reliable: a line above its story's title belongs to another story."""
    titled = [s for s in stories if s.get("title_bbox")]
    for s in stories:
        tb = s.get("title_bbox")
        if not tb:
            continue
        bad = [l for l in s["lines"] if l["bbox"][3] < tb[1] - 2]
        for l in bad:
            best, score = None, 1e9
            for t in titled:
                if t is s:
                    continue
                ttb = t["title_bbox"]
                if ttb[1] > l["bbox"][1] + 2:
                    continue
                dy = l["bbox"][1] - ttb[3]
                dx = max(0, ttb[0] - l["bbox"][2], l["bbox"][0] - ttb[2])
                sc = dy + 3 * dx
                if sc < score:
                    best, score = t, sc
            if best is not None:
                s["lines"].remove(l)
                best["lines"].append(l)
    # a line belongs to the nearest title above it in the same column, if its own title is not in that column
    def xover(a, b):
        return min(a[2], b[2]) - max(a[0], b[0])

    for s in stories:
        tb = s.get("title_bbox")
        if not tb:
            continue
        moved = []
        for l in s["lines"]:
            lb = l["bbox"]
            if xover(lb, tb) > 0 or lb[1] < tb[1]:
                continue
            best = None
            for t in titled:
                if t is s:
                    continue
                ttb = t["title_bbox"]
                if ttb[3] <= lb[1] + 2 and ttb[1] > tb[1] + 5 and xover(lb, ttb) > 0.3 * (lb[2] - lb[0]):
                    if best is None or ttb[1] > best["title_bbox"][1]:
                        best = t
            if best is not None:
                moved.append((l, best))
        for l, t in moved:
            s["lines"].remove(l)
            t["lines"].append(l)
    for s in stories:
        s["lines"].sort(key=lambda l: l["order"])
    return stories


def join_rows(lines):
    """Merge fragments printed on the same baseline within the same column into rows."""
    rows = []
    for l in lines:
        if rows:
            r = rows[-1]
            if abs(l["bbox"][1] - r["bbox"][1]) < 2.5 and 0 <= l["bbox"][0] - r["bbox"][2] < 30:
                r["text"] = r["text"].rstrip() + " " + l["text"].strip()
                r["bbox"] = [r["bbox"][0], r["bbox"][1], l["bbox"][2], max(r["bbox"][3], l["bbox"][3])]
                continue
        rows.append(dict(l))
    return rows


SENT_END = re.compile(r"[.!?:…”\")]\s*$")


def rows_to_blocks(rows):
    """Turn rows into paragraphs / crossheads, undoing hyphenation and justified-line wraps."""
    if not rows:
        return []
    # column right edges: max x1 per column (grouped by x0)
    cols = {}
    for r in rows:
        key = round(r["bbox"][0] / 6)
        cols[key] = max(cols.get(key, 0), r["bbox"][2])

    blocks = []
    cur = None
    prev = None
    for r in rows:
        t = r["text"].strip()
        col_right_r = cols[round(r["bbox"][0] / 6)]
        is_cross = (r["medium"] and not r["italic"] and len(t) < 60 and r["size"] < 11.5
                    and not t.endswith("-") and r["bbox"][2] < col_right_r - 14)
        new_para = False
        if prev is None:
            new_para = True
        else:
            prev_t = prev["text"].strip()
            col_right = cols[round(prev["bbox"][0] / 6)]
            short = prev["bbox"][2] < col_right - 14
            if short and SENT_END.search(prev_t):
                new_para = True
            if is_cross != (cur["type"] == "h3"):
                new_para = True
            # a jump back up to a new column does not break a paragraph
        # right-aligned short line after a paragraph = signature
        is_sig = (prev is not None and len(t) < 50 and r["bbox"][0] > prev["bbox"][0] + 25
                  and r["bbox"][2] >= prev["bbox"][2] - 8 and not t.endswith("-"))
        if is_sig:
            cur = {"type": "sig", "text": t, "italic": r["italic"]}
            blocks.append(cur)
            prev = r
            continue
        if cur is not None and cur["type"] == "sig":
            new_para = True
        if new_para:
            cur = {"type": "h3" if is_cross else "p", "text": t, "italic": r["italic"]}
            blocks.append(cur)
        else:
            if cur["text"].endswith("-") and re.match(r"[a-záéíóöőúüű]", t):
                if re.search(r"[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]{2}-$", cur["text"]):
                    cur["text"] = cur["text"][:-1] + t
                else:
                    cur["text"] = cur["text"] + t
            else:
                cur["text"] = cur["text"] + " " + t
        prev = r
    for b in blocks:
        b["text"] = re.sub(r"\s{2,}", " ", b["text"]).strip()
    # merge consecutive crossheads (two-line crossheads)
    out = []
    for b in blocks:
        if out and b["type"] == "h3" and out[-1]["type"] == "h3":
            out[-1]["text"] += " " + b["text"]
        else:
            out.append(b)
    for b in out:
        if b["type"] == "h3" and len(b["text"]) > 75:
            b["type"] = "p"
            b["strong"] = True
    return out


def process_pdf(pdf_path, overlay_dir=None):
    doc = pymupdf.open(pdf_path)
    stem = pdf_path.stem
    pages_out = []
    for pno, page in enumerate(doc):
        images = page_images(page, plain_body_lines(page))
        boxes = tinted_boxes(page)
        lines, labels = collect_lines(page, images, pno)
        lines = classify(lines, pno)
        free = [l for l in lines if not l["in_image"]]
        in_img = [l for l in lines if l["in_image"]]
        items = merge_heads(free)
        stories = segment_page(items) if pno == 0 else segment_page_geo(items)
        stories = split_boxes(stories, boxes)
        stories = [s for s in stories if not is_impressum(s)]
        for s in stories:
            s["bbox"] = story_bbox(s)
        imgs = assign_images(stories, images, in_img)
        extract_caption(stories, imgs)
        page_rec = {"page": pno + 1, "section": [x for x in labels if len(x) < 30], "stories": [], "images": imgs}
        for si, s in enumerate(stories):
            rows = join_rows(s["lines"])
            page_rec["stories"].append({
                "sid": f"p{pno+1:02d}s{si}",
                "title": s["title"],
                "kicker": s.get("kicker"),
                "deck": " ".join(s["deck"]) if s["deck"] else None,
                "orphan": bool(s.get("orphan")),
                "box": bool(s.get("box")),
                "bbox": [round(v, 1) for v in s["bbox"]] if s["bbox"] else None,
                "title_bbox": [round(v, 1) for v in s["title_bbox"]] if s.get("title_bbox") else None,
                "title_size": s.get("title_size") or 0,
                "blocks": rows_to_blocks(rows),
                "chars": sum(len(r["text"]) for r in rows),
            })
        pages_out.append(page_rec)

        if overlay_dir:
            draw_overlay(page, pno, stories, imgs, overlay_dir, stem)
    doc.close()
    return {"stem": stem, "pages": pages_out}


PALETTE = [(217, 26, 26), (26, 115, 217), (26, 166, 51), (204, 115, 0), (140, 26, 179),
           (0, 153, 153), (204, 26, 128), (102, 102, 0)]


def draw_overlay(page, pno, stories, imgs, overlay_dir, stem):
    from PIL import Image, ImageDraw, ImageFont
    z = 1.1
    pix = page.get_pixmap(matrix=pymupdf.Matrix(z, z))
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    dr = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arialbd.ttf", 17)
    except OSError:
        font = ImageFont.load_default()
    sc = lambda r: [r[0] * z, r[1] * z, r[2] * z, r[3] * z]
    for si, s in enumerate(stories):
        col = PALETTE[si % len(PALETTE)]
        for l in s["lines"]:
            dr.rectangle(sc(l["bbox"]), outline=col, width=1)
        if s.get("title_bbox"):
            dr.rectangle(sc(s["title_bbox"]), outline=col, width=3)
        if s["bbox"]:
            r = sc(s["bbox"])
            dr.text((r[0] + 2, r[1] - 2), f"S{si}", fill=col, font=font)
    for im in imgs:
        col = (128, 128, 128) if im["ad_guess"] else (PALETTE[im["story"] % len(PALETTE)] if im["story"] is not None else (0, 0, 0))
        r = sc(im["bbox"])
        dr.rectangle(r, outline=col, width=4)
        tag = f"I{im['idx']}" + ("=AD?" if im["ad_guess"] else f"->S{im['story']}")
        dr.rectangle([r[0] + 3, r[1] + 3, r[0] + 12 * len(tag), r[1] + 24], fill=(255, 255, 255))
        dr.text((r[0] + 5, r[1] + 4), tag, fill=col, font=font)
    Path(overlay_dir).mkdir(parents=True, exist_ok=True)
    img.save(str(Path(overlay_dir) / f"{stem}_p{pno+1:02d}.jpg"), quality=62)


def run_one(job):
    pdf, overlay = job
    res = process_pdf(pdf, overlay)
    out = OUT_DIR / f"{pdf.stem}.auto.json"
    out.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    n = sum(len(p["stories"]) for p in res["pages"])
    return f"{pdf.stem}: {len(res['pages'])} oldal, {n} szövegegység -> {out.name}"


def main():
    from multiprocessing import Pool
    ap = argparse.ArgumentParser()
    ap.add_argument("--overlay", help="folder for review images")
    ap.add_argument("--only", help="stem filter")
    args = ap.parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    jobs = [(pdf, args.overlay) for pdf in sorted(PDF_DIR.glob("kev_2026*.pdf"))
            if not args.only or args.only in pdf.stem]
    with Pool(min(len(jobs), 5)) as pool:
        for msg in pool.imap_unordered(run_one, jobs):
            print(msg, flush=True)


if __name__ == "__main__":
    main()
