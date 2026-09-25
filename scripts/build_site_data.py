#!/usr/bin/env python3
"""
Kőszeg és Vidéke – a weboldal adatainak előállítása.

  1. 2026-os cikkek: segment_2026.py kimenete + curation.json kézi szerkesztői döntései
     -> src/data/articles.json, a cikkekhez tartozó fotók kivágva: public/images/2026/...
  2. Lapszámok (2012–2026): src/data/issues.json, borító-bélyegképek: public/covers/...
  3. Teljes szövegű archívum-kereső: public/search/<év>.json (oldalanként, igény szerint töltődik be)

Futtatás a projekt gyökeréből:  python scripts/build_site_data.py [--no-images] [--no-search]
"""

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf
import pyphen
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
FORCE_IMAGES = False
ARCH = ROOT / "koszeg_es_videke_archive"
AUTO_DIR = ARCH / "articles_2026"
CURATION = AUTO_DIR / "curation.json"
PDF_DIR = ARCH / "pdf"
PROCESSED = ARCH / "processed"
DATA_OUT = ROOT / "src" / "data"
PUBLIC = ROOT / "public"

MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus",
          "szeptember", "október", "november", "december"]

# Rovatok: a nyomtatott lap oldalsávjában szereplő rovatcímekből
SECTIONS = [
    {"slug": "varoshaza", "name": "Városháza", "labels": ["VÁROSHÁZA", "VÁLASZTÁSOK", "ÖSSZESEN"]},
    {"slug": "aktualis", "name": "Aktuális", "labels": ["AKTUÁLIS", "ISKOLÁK", "DIÁKOK", "OSTROMNAPOK"]},
    {"slug": "videk", "name": "Vidék", "labels": ["VIDÉK"]},
    {"slug": "kultura", "name": "Kultúra", "labels": ["KULTÚRA", "PROGRAMOK"]},
    {"slug": "sport", "name": "Sport", "labels": ["SPORT"]},
    {"slug": "nemzetisegek", "name": "Nemzetiségek", "labels": ["KŐSZEGI NÉMETEK", "KŐSZEGI HORVÁTOK"]},
    {"slug": "hitelet", "name": "Hitélet", "labels": ["HITÉLET"]},
    {"slug": "kulonfelek", "name": "Különfélék", "labels": ["KÜLÖNFÉLÉK", "MOZAIK", "KÁVÉSZÜNET", "EGYEBEK", "IN MEMORIAM"]},
]
LABEL_TO_SECTION = {lab: s["slug"] for s in SECTIONS for lab in s["labels"]}

INITIALS = {
    "KZ": "Kámán Zoltán",
    "K.Z.": "Kámán Zoltán",
    "KÁMÁN ZOLTÁN": "Kámán Zoltán",
}

# Minden lapszámban visszatérő szolgáltatási közlemények – nem cikkek (a keresőben a PDF-oldalon megtalálhatók)
NOTICE_TITLES = re.compile(
    r"^(fogadóórák|megjelenés\s*[–-]\s*terjesztés|hulladékszállítás|lomilottó|köszöntések|anyakönyvi hírek|"
    r"kőszeg lomtalanítás|programajánló|rendelési időpontok)", re.I)

BYLINE_RE = re.compile(r"^(?:írta(?: és fényképezte| és fotózta)?|szöveg(?: és fotó)?|összeállította|lejegyezte)\s*:?\s*(.+)$", re.I)
PHOTO_RE = re.compile(r"^(?:fotó(?:k)?|kép(?:ek)?|fénykép(?:ek)?)\s*:\s*(.+)$", re.I)


_HYPH = pyphen.Pyphen(lang="hu_HU", left=3, right=3)
_WORD = re.compile(r"[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]{7,}")


def hyphenate(text):
    """Soft hyphens (U+00AD) into long words: justified text breaks evenly on every device."""
    return _WORD.sub(lambda m: _HYPH.inserted(m.group(0), hyphen="\u00ad"), text)


def slugify(text):
    t = unicodedata.normalize("NFD", text.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:70].rstrip("-")


def fix_text(t):
    t = t.replace("\u00ad", "").replace("\xa0", " ")
    t = re.sub(r"\s+([,.;:!?])(?=\s|$)", r"\1", t)
    t = re.sub(r"„\s+", "„", t)
    t = re.sub(r"\s+”", "”", t)
    t = re.sub(r"\s{2,}", " ", t)
    return t.strip()


def title_case_fix(title):
    """Titles set in capitals on the cover become sentence case (easier to read)."""
    letters = [c for c in title if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > 0.85 and len(letters) > 6:
        t = title.lower()
        return t[:1].upper() + t[1:]
    return title


ROLE_WORDS = {"polgármester", "alpolgármester", "jegyző", "aljegyző", "elnök", "elnöke", "igazgató", "főigazgató",
              "plébános", "lelkész", "képviselő", "országgyűlési", "karnagy", "vezető", "vezetője", "titkár",
              "szerkesztő", "tanár", "intézményvezető", "elnökhelyettes", "igazgatója", "polgárőr", "és", "a", "az"}


def _is_name_line(t):
    words = [w.strip("(),–-") for w in t.split()]
    words = [w for w in words if w]
    if not words or len(words) > 8:
        return False
    if len(words) == 1:
        return words[0].lower() in ROLE_WORDS - {"és", "a", "az"}
    caps = sum(1 for w in words if w[:1].isupper())
    roles = sum(1 for w in words if w.lower() in ROLE_WORDS)
    return caps + roles == len(words) and (caps >= 2 or (caps >= 1 and roles >= 1))


def split_signature(blocks):
    """Remove trailing signature / photo-credit blocks and return (blocks, author, photo_credit)."""
    author, photo = None, None
    sig_chain = False
    blocks = list(blocks)
    for _ in range(4):
        if not blocks:
            break
        last = blocks[-1]
        if "text" not in last:
            break  # keretes doboz a cikk végén
        t = last["text"].strip()
        m = BYLINE_RE.match(t)
        p = PHOTO_RE.match(t)
        if m and len(t) < 90:
            author = author or m.group(1).strip()
            blocks.pop()
            continue
        if p and len(t) < 90:
            photo = photo or p.group(1).strip()
            blocks.pop()
            continue
        # "Írta és fényképezte: Kámán Zoltán" can end up merged as "... Írta és fényképezte: Kámán Zoltán"
        m2 = re.search(r"\s(írta(?: és fényképezte)?\s*:\s*[A-ZÁÉÍÓÖŐÚÜŰ][^.]{3,40})$", t, re.I)
        if m2:
            author = author or BYLINE_RE.match(m2.group(1)).group(1).strip()
            last["text"] = t[: m2.start()].strip()
            continue
        clean = t.strip("–-() ")
        if clean.upper() in INITIALS:
            author = author or INITIALS[clean.upper()]
            blocks.pop()
            continue
        # short signature line: a name (optionally with a role), right-aligned or set in Medium weight
        if last["type"] in ("h3", "sig") and len(t) <= 70 and not t.endswith((".", ":", "?", "!")):
            # "Básthy Béla" + "polgármester" on two lines -> one byline
            author = f"{t} {author}" if (author and sig_chain) else (author or t)
            sig_chain = True
            blocks.pop()
            continue
        # plain paragraph that is only a name / role ("Láng József", "Kovácsné Szabó Éva", "polgármester")
        if last["type"] == "p" and len(t) <= 60 and not t.endswith((".", ":", "?", "!", ",")) and _is_name_line(t):
            author = f"{t} {author}" if (author and sig_chain) else (author or t)
            sig_chain = True
            blocks.pop()
            continue
        # trailing initials glued to the last paragraph: "... vége. KZ"
        m3 = re.search(r"\s(KZ|K\.Z\.)$", t)
        if m3:
            author = author or INITIALS[m3.group(1)]
            last["text"] = t[: m3.start()].strip()
            continue
        break
    if author and re.sub(r"[\s.]", "", author.upper()) in {"KÁMÁNZ", "KZ", "KZ/SZERK", "KÁMÁNZ/SZERK"}:
        author = "Kámán Zoltán"
    if author:
        # egybetűs maradvány a név előtt ("y Varsányi Áron" -> "Varsányi Áron")
        author = re.sub(r"^(?:[a-záéíóöőúüű]\s+)+", "", author.strip()).strip() or None
    # any remaining signature-type block inside the text is shown as a normal paragraph
    for b in blocks:
        if b["type"] == "sig":
            b["type"] = "p"
    return blocks, author, photo


def make_lead(blocks, deck):
    if deck and len(deck) >= 60:
        return deck
    for b in blocks:
        if b["type"] == "p" and len(b["text"]) > 60:
            t = b["text"]
            if len(t) <= 260:
                return t
            cut = t[:260]
            dot = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
            if dot > 120:
                return cut[: dot + 1]
            return cut[: cut.rfind(" ")] + " …"
    return ""


SPORT_TITLE = re.compile(
    r"^(labdarúgás|foci|futball|birkózás|atlétika|tenisz|boksz|ökölvív|karate|asztalitenisz|úszás|gyorskorcsolya|"
    r"triatlon|kézilabda|futsal|diáksport|kosárlabda|röplabda|sakk|teke|judo|cselgáncs|sporttábor)", re.I)


def pick_section(page_rec, title=""):
    if SPORT_TITLE.match(title or ""):
        return "sport"
    # több rovatfelirat esetén az utoljára rajzolt a látható (a sablon régi felirata alatta marad)
    labels = [lab.strip().upper() for lab in page_rec.get("section", [])]
    for lab in reversed(labels):
        if lab in LABEL_TO_SECTION:
            return LABEL_TO_SECTION[lab]
    return None


def trim_frame(img, max_share=0.18):
    """
    A nyomtatott képkeret (fehér szegély és szürke árnyék) levágása a kép széleiről.
    Keretnek számít az a sor/oszlop, amely világos (átlag > 200) és szinte egyszínű (kis szórás),
    így a valódi kép (akár világos égbolt is) megmarad, mert az nem egyenletes.
    """
    from PIL import ImageOps, ImageStat
    gray = ImageOps.grayscale(img)
    w, h = gray.size

    def is_frame(box):
        st = ImageStat.Stat(gray.crop(box))
        return st.mean[0] > 200 and st.stddev[0] < 9

    top = 0
    while top < h * max_share and is_frame((0, top, w, top + 1)):
        top += 1
    bottom = h
    while bottom > h * (1 - max_share) and is_frame((0, bottom - 1, w, bottom)):
        bottom -= 1
    left = 0
    while left < w * max_share and is_frame((left, top, left + 1, bottom)):
        left += 1
    right = w
    while right > w * (1 - max_share) and is_frame((right - 1, top, right, bottom)):
        right -= 1
    if (left, top, right, bottom) == (0, 0, w, h):
        return img
    m = max(1, round(min(w, h) * 0.004))  # kis ráhagyás a keret/árnyék elmosódott széle miatt
    return img.crop((min(left + m, w // 2), min(top + m, h // 2), max(right - m, w // 2), max(bottom - m, h // 2)))


def render_clip(doc, page_no, bbox, out_path, max_w=1400):
    page = doc[page_no - 1]
    r = pymupdf.Rect(bbox) & page.rect
    zoom = min(4.0, max(2.0, max_w / max(r.width, 1)))
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=r)
    img = trim_frame(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    if img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "JPEG", quality=84, optimize=True, progressive=True)
    return img.width, img.height


def write_json(path, data, compact=False):
    """Atomic write: the running dev server never sees a half-written file."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) if compact else json.dumps(data, ensure_ascii=False, indent=1)
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def load_issue_meta():
    issues = json.loads((ARCH / "index" / "issues.json").read_text(encoding="utf-8"))
    out = {}
    for it in issues:
        stem = it["filename"][:-4]
        proc = PROCESSED / f"{stem}.json"
        vol, num, pages = None, None, 0
        if proc.exists():
            pj = json.loads(proc.read_text(encoding="utf-8"))
            pages = pj.get("page_count", 0)
            head = " ".join(p["text"] for p in pj["pages"][:3])
            m = re.search(r"([IVXLC]+)\.\s*ÉVFOLYAM,?\s*(\d+)\.\s*SZÁM", head.replace("\n", " "), re.I)
            if m:
                vol, num = m.group(1).upper(), int(m.group(2))
        out[stem] = {
            "id": stem,
            "year": it["year"], "month": it["month"], "day": it["day"],
            "date": it["date"],
            "serial": it["issue_number"],
            "volume": vol, "number": num,
            "pages": pages,
            "pdf": it["url"],
            "label": f"{it['year']}. {MONTHS[it['month'] - 1]}",
        }
    return out


def build_covers(issues):
    src_dir = PUBLIC / "archive_covers"
    out_dir = PUBLIC / "covers"
    out_dir.mkdir(parents=True, exist_ok=True)
    for stem, meta in issues.items():
        src = src_dir / f"{stem}.jpg"
        dst = out_dir / f"{stem}.jpg"
        if src.exists():
            if not dst.exists():
                im = Image.open(src).convert("RGB")
                im.thumbnail((520, 760), Image.LANCZOS)
                im.save(dst, "JPEG", quality=80, optimize=True, progressive=True)
            meta["cover"] = f"/covers/{stem}.jpg"
            meta["coverLarge"] = f"/archive_covers/{stem}.jpg"
        else:
            meta["cover"] = None


def _xover(a, b):
    return min(a[2], b[2]) - max(a[0], b[0])


def auto_story_fixes(auto):
    """
    Általános, minden lapszámra érvényes javítások:
      * kettétört cím: szöveg nélküli cím alatt közvetlenül újabb cím -> azonos méretnél egy cím, kisebbnél alcím
      * sporteredmény-dobozok: keretes blokként a legközelebbi cikkhez
    """
    fixes = {}
    for pg in auto["pages"]:
        st = pg["stories"]
        for i, a in enumerate(st):
            if not a.get("title") or a["chars"] > 0 or not a.get("title_bbox"):
                continue
            ab = a["title_bbox"]
            for b in st:
                if b is a or not b.get("title") or not b.get("title_bbox"):
                    continue
                bb = b["title_bbox"]
                if -12 <= bb[1] - ab[3] <= 45 and _xover(ab, bb) > 0:
                    if abs((b.get("title_size") or 0) - (a.get("title_size") or 0)) < 2:
                        fixes[a["sid"]] = {"title": f"{a['title'].strip()} {b['title'].strip()}", "keep": True}
                    else:
                        fixes[a["sid"]] = {"deck": b["title"].strip(), "keep": True}
                    fixes[b["sid"]] = {"merge_into": a["sid"]}
                    break
        sport_page = any(lab.strip().upper() == "SPORT" for lab in pg.get("section", []))
        titled = [s for s in st if s.get("title") and s.get("bbox") and s["sid"] not in fixes]
        for s in st:
            if not s.get("box") or not s["blocks"] or not s.get("bbox"):
                continue
            first = s["blocks"][0]["text"]
            if not (sport_page or first.lower().startswith("eredmény")):
                continue
            sb = s["bbox"]

            def dist(t):
                tb = t["bbox"]
                dx = max(0, tb[0] - sb[2], sb[0] - tb[2])
                dy = max(0, tb[1] - sb[3], sb[1] - tb[3])
                return dx + dy

            if titled:
                target = min(titled, key=dist)
                fixes[s["sid"]] = {"merge_into": target["sid"], "as_box": True,
                                   "box_title": "Eredmények" if first.lower().startswith("eredmény") else None}
    return fixes


def build_articles(issues, with_images=True):
    curation = json.loads(CURATION.read_text(encoding="utf-8")) if CURATION.exists() else {}
    rec_file = AUTO_DIR / "recurring_ads.json"
    recurring = json.loads(rec_file.read_text(encoding="utf-8")) if rec_file.exists() else {}
    articles = []
    for auto_file in sorted(AUTO_DIR.glob("kev_2026*.auto.json")):
        auto = json.loads(auto_file.read_text(encoding="utf-8"))
        stem = auto["stem"]
        cur = curation.get(stem, {})
        s_over = cur.get("stories", {})
        # hirdetésképek: ismétlődő (automatikus) + kézzel jelölt, kivéve a kézzel visszaengedetteket
        ads = {}
        for k, v in recurring.get(stem, {}).items():
            ads.setdefault(int(k), set()).update(v)
        for k, v in cur.get("ads", {}).items():
            ads.setdefault(int(k.lstrip("p")), set()).update(v)
        for k, v in cur.get("not_ads", {}).items():
            ads.setdefault(int(k.lstrip("p")), set()).difference_update(v)
        issue = issues[stem]
        doc = pymupdf.open(PDF_DIR / "2026" / f"{stem}.pdf") if with_images else None

        by_sid = {}
        page_of = {}
        for pg in auto["pages"]:
            for s in pg["stories"]:
                by_sid[s["sid"]] = s
                page_of[s["sid"]] = pg

        # automatikus javítások (a kézi curation.json felülírja őket)
        auto_over = auto_story_fixes(auto)
        s_over = {sid: {**auto_over.get(sid, {}), **s_over.get(sid, {})} for sid in set(auto_over) | set(s_over)}

        # which stories survive
        order = []
        for pg in auto["pages"]:
            for s in pg["stories"]:
                o = s_over.get(s["sid"], {})
                if o.get("drop") or o.get("merge_into"):
                    continue
                default_keep = (not s["orphan"] and not s["box"] and s["title"] and s["chars"] >= 200
                                and not NOTICE_TITLES.match(s["title"].strip()))
                if not (o.get("keep") or default_keep or o.get("title")):
                    continue
                order.append(s["sid"])

        merges = {}
        for sid, o in s_over.items():
            if o.get("merge_into"):
                merges.setdefault(o["merge_into"], []).append(sid)

        for rank, sid in enumerate(order):
            s = by_sid[sid]
            o = s_over.get(sid, {})
            pg = page_of[sid]
            blocks = [dict(b) for b in s["blocks"]]
            for extra in sorted(merges.get(sid, []), key=lambda x: (int(x[1:3]), x)):
                eb = [dict(b) for b in by_sid[extra]["blocks"]]
                if s_over.get(extra, {}).get("as_box"):
                    box_title = s_over[extra].get("box_title")
                    if box_title and eb and eb[0].get("text", "").lower().startswith(box_title.lower()):
                        eb[0]["text"] = eb[0]["text"][len(box_title):].lstrip(" :–-")
                    eb = [{"type": "box", "title": box_title, "items": [x for x in eb if x.get("text")]}]
                blocks += eb
            for pat in o.get("drop_blocks", []):
                if pat.startswith("="):
                    blocks = [b for b in blocks if b.get("text", "").strip() != pat[1:]]
                else:
                    blocks = [b for b in blocks if pat not in b.get("text", "")]
            for old_s, new_s in o.get("replace", []):
                for b in blocks:
                    if "text" in b:
                        b["text"] = b["text"].replace(old_s, new_s)
                    for it in b.get("items", []):
                        it["text"] = it["text"].replace(old_s, new_s)
            if o.get("prefix_first") and blocks and "text" in blocks[0]:
                blocks[0]["text"] = o["prefix_first"] + blocks[0]["text"]
            for b in blocks:
                if "text" in b:
                    b["text"] = fix_text(b["text"])
            blocks = [b for b in blocks if b.get("type") == "box" or b["text"]]
            blocks, author, photo = split_signature(blocks)
            if o.get("author") is not None:
                author = o["author"] or None
            if o.get("photo") is not None:
                photo = o["photo"] or None

            title = fix_text(o.get("title") or title_case_fix(s["title"] or ""))
            deck = o.get("deck", s.get("deck"))
            deck = fix_text(deck) if deck else None
            kicker = o.get("kicker", s.get("kicker"))
            kicker = title_case_fix(fix_text(kicker)) if kicker else None
            section = o.get("section") or pick_section(pg, title) or "aktualis"

            # images: automatic assignment unless overridden; ids like "p05:0"
            if "images" in o:
                img_refs = o["images"]
            else:
                img_refs = []
                for pnum in sorted({pg["page"], *[int(x[1:3]) for x in merges.get(sid, [])]}):
                    pgrec = auto["pages"][pnum - 1]
                    for im in pgrec["images"]:
                        if im["idx"] in ads.get(pnum, set()) or im["ad_guess"]:
                            continue
                        target = pgrec["stories"][im["story"]]["sid"] if im["story"] is not None else None
                        if target == sid or target in merges.get(sid, []):
                            img_refs.append(f"p{pnum:02d}:{im['idx']}")
            images = []
            captions = o.get("captions", {})
            for ci, ref in enumerate(img_refs):
                if isinstance(ref, dict):
                    # kézzel megadott kivágás: {"page": 7, "bbox": [x0, y0, x1, y1], "caption": "..."}
                    pnum = ref["page"]
                    im = {"bbox": ref["bbox"], "caption": ref.get("caption")}
                    rel = f"images/2026/{stem}/p{pnum:02d}-{slugify(title)[:30]}-c{ci}.jpg"
                    ref = f"p{pnum:02d}:c{ci}"
                else:
                    pnum, idx = ref.split(":")
                    pnum, idx = int(pnum.lstrip("p")), int(idx)
                    im = next(i for i in auto["pages"][pnum - 1]["images"] if i["idx"] == idx)
                    rel = f"images/2026/{stem}/p{pnum:02d}-{idx}.jpg"
                w = h = None
                if with_images and (FORCE_IMAGES or not (PUBLIC / rel).exists()):
                    w, h = render_clip(doc, pnum, im["bbox"], PUBLIC / rel)
                elif (PUBLIC / rel).exists():
                    w, h = Image.open(PUBLIC / rel).size
                images.append({"src": "/" + rel, "w": w, "h": h,
                               "caption": fix_text(captions.get(ref) or im.get("caption") or "") or None})

            text_len = sum(len(b.get("text", "")) for b in blocks)
            for b in blocks:
                if b["type"] == "p":
                    b["text"] = hyphenate(b["text"])
                elif b["type"] == "box":
                    for it in b.get("items", []):
                        it["text"] = hyphenate(fix_text(it["text"]))
            slug = slugify(title) or sid
            aid = f"{issue['date']}-{slug}"
            articles.append({
                "id": aid,
                "slug": aid,
                "issueId": stem,
                "date": issue["date"],
                "page": pg["page"],
                "section": section,
                "title": title,
                "kicker": kicker,
                "deck": deck,
                "lead": hyphenate(fix_text(o.get("lead") or make_lead(blocks, deck).replace("\u00ad", ""))),
                "author": author,
                "photoCredit": photo,
                "blocks": blocks,
                "images": images,
                "readingMinutes": max(1, round(text_len / 1100)),
                "weight": o.get("weight", 0),
                "rank": rank,
            })
        if doc:
            doc.close()
    # unique ids
    seen = {}
    for a in articles:
        if a["id"] in seen:
            seen[a["id"]] += 1
            a["id"] = a["slug"] = f"{a['id']}-{seen[a['id']]}"
        else:
            seen[a["id"]] = 1
    return articles


def normalize_search_text(t):
    t = t.replace("\u00ad", "")
    t = re.sub(r"(\w)-\n(\w)", r"\1\2", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def build_search(issues):
    out_dir = PUBLIC / "search"
    out_dir.mkdir(parents=True, exist_ok=True)
    years = {}
    for f in sorted(PROCESSED.glob("kev_*.json")):
        pj = json.loads(f.read_text(encoding="utf-8"))
        stem = f.stem
        if stem not in issues:
            continue
        pages = [normalize_search_text(p["text"]) for p in pj["pages"]]
        years.setdefault(pj["year"], []).append({"i": stem, "p": pages})
    manifest = []
    for y, items in sorted(years.items()):
        path = out_dir / f"{y}.json"
        write_json(path, items, compact=True)
        manifest.append({"year": y, "file": f"/search/{y}.json", "bytes": path.stat().st_size})
    return manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--no-search", action="store_true")
    ap.add_argument("--force-images", action="store_true", help="minden képet újrarenderel")
    args = ap.parse_args()
    global FORCE_IMAGES
    FORCE_IMAGES = args.force_images

    DATA_OUT.mkdir(parents=True, exist_ok=True)
    issues = load_issue_meta()
    build_covers(issues)
    articles = build_articles(issues, with_images=not args.no_images)
    counts = {}
    for a in articles:
        counts[a["issueId"]] = counts.get(a["issueId"], 0) + 1
    for stem, meta in issues.items():
        meta["articleCount"] = counts.get(stem, 0)

    issue_list = sorted(issues.values(), key=lambda x: x["date"], reverse=True)
    sections = [{"slug": s["slug"], "name": s["name"]} for s in SECTIONS]
    write_json(DATA_OUT / "issues.json", issue_list)
    # A böngésző induló csomagjába csak a cikklista kerül; a teljes szöveg cikkenként külön fájlban,
    # megnyitáskor töltődik be, a kereséshez pedig egy igény szerint letöltött szövegfájl készül.
    content_dir = PUBLIC / "content"
    content_dir.mkdir(parents=True, exist_ok=True)
    for old in content_dir.glob("*.json"):
        old.unlink()
    index, search_rows = [], []
    for a in articles:
        write_json(content_dir / f"{a['id']}.json", {"id": a["id"], "blocks": a["blocks"]}, compact=True)
        body = " ".join(
            " ".join(x["text"] for x in b["items"]) if b["type"] == "box" else b["text"] for b in a["blocks"]
        ).replace("­", "")
        search_rows.append({"id": a["id"], "t": body})
        index.append({k: v for k, v in a.items() if k != "blocks"})
    write_json(content_dir / "search-2026.json", search_rows, compact=True)
    write_json(DATA_OUT / "articles.json", index, compact=True)
    write_json(DATA_OUT / "sections.json", sections)
    if not args.no_search:
        manifest = build_search(issues)
        write_json(DATA_OUT / "searchManifest.json", manifest)
    print(f"{len(issue_list)} lapszám, {len(articles)} cikk (2026)")
    for stem in sorted(counts):
        print(f"  {stem}: {counts[stem]} cikk")


if __name__ == "__main__":
    main()
