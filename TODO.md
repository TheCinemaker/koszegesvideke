# TODO – Kőszeg és Vidéke (béta után)

Állapot: 2026-09-24, béta feltöltve (`13d78a6`). Adatlánc:
`scripts/segment_2026.py` → `scripts/detect_recurring_ads.py` → `scripts/build_site_data.py`
Kézi javítások: `koszeg_es_videke_archive/articles_2026/curation.json`

## 0. Béta teszt hibái (felhasználói visszajelzés, 2026-09-24)

- [ ] **Sortörési hibák sok cikkben** – bekezdések rossz helyen törnek vagy összeolvadnak.
      Ellenőrizni: `rows_to_blocks()` a `segment_2026.py`-ban (bekezdéshatár, elválasztás visszaállítása,
      félkövér nyitószavak), illetve a feltételes elválasztójelek (`hyphenate()` a `build_site_data.py`-ban)
- [ ] **Rossz fotók sok cikknél** – minden lapszám képeit emberi szemmel is átnézni
      (kontaktlap: cikkcím + képazonosító), hibás képek → `curation.json` `ads` / `images`
- [ ] **Rossz képméretek** – néhány kép túl kicsi, túl nagy vagy rosszul vágott; átméretezni.
      Ellenőrizni: `render_clip()` nagyítása és a kártyák képarányai (`ArticleCard.jsx`: 16/10, 3/2, 4/3, 1/1),
      csíkokra vágott kollázsoknál kézi kivágás (`images: [{page, bbox}]`)

## 0.5 SEO és Google (fontos: a Google azonnal találja meg)

- [ ] **Útvonalak `#/cikk/...` helyett valódi URL-ekre (`/cikk/...`)** – a `#` utáni részt a Google NEM
      indexeli külön oldalként, így most egyetlen cikk sem kereshető. `src/lib/router.js` → History API,
      a tárhelyen minden útvonal az `index.html`-re essen (rewrite)
- [ ] **Előrenderelés (prerender/SSR)**: minden cikkoldal kész HTML-ként legyen kiszolgálva, ne csak JS-ből
      (pl. `vite-plugin-ssr`/Vike, vagy build utáni statikus generálás a `scripts/smoke-render.mjs` alapján)
- [ ] oldalanként saját `<title>`, `meta description`, kanonikus URL (`<link rel="canonical">`)
- [ ] Open Graph + Twitter kártya (cím, bevezető, főkép) – Facebook-megosztáshoz is
- [ ] strukturált adat (JSON-LD): `NewsArticle` (cím, dátum, szerző, kép), `NewsMediaOrganization`,
      `BreadcrumbList`, a címlapon `WebSite` + `SearchAction` (Google keresőmező)
- [ ] `sitemap.xml` (minden cikk, rovat, lapszám) + `news-sitemap.xml` (Google News, utolsó 2 nap) – a
      `build_site_data.py` generálja
- [ ] `robots.txt` a sitemap hivatkozással
- [ ] Google Search Console: tulajdon igazolása, sitemap beküldése; Google News Publisher Center
- [ ] Google Analytics 4 (vagy adatvédelmileg barátságosabb alternatíva) + süti-tájékoztató (GDPR)
- [ ] képek: `alt` szövegek, `width`/`height`, WebP/AVIF változat, `srcset` a mobilhoz
- [ ] Core Web Vitals / PageSpeed Insights mobilon: LCP, CLS mérése és javítása
- [ ] RSS feed (`/rss.xml`) a friss cikkekhez
- [ ] PWA: `manifest.webmanifest`, telepíthető app, offline olvasás (a favicont/ikonokat a Gemini készíti)

## 1. Tartalom – kézi ellenőrzés (legfontosabb)

Lapszámonként: kontaktlap a képekről, hirdetések kiszűrése (`ads`), árva folytatások
összefűzése (`merge_into`), címek/szerzők javítása.

- [x] 2026. szeptember (`kev_20260914_172`)
- [ ] 2026. augusztus (`kev_20260817_171`) – részben kész
  - [ ] címlapsztori (p01 árva szöveg) cím nélkül kimaradt → cím + `keep`
  - [ ] p08 árva vélemény (Móra Tímea) – cím hiányzik
  - [ ] p17 Ólmod / Fejlesztések (Bozsok) szövegei összekeveredtek
- [ ] 2026. július (`kev_20260706_170`)
- [ ] 2026. június (`kev_20260608_169`)
- [ ] 2026. május (`kev_20260511_168`)
- [ ] 2026. április (`kev_20260414_167`)
- [ ] 2026. március (`kev_20260316_166`)
- [ ] 2026. február (`kev_20260216_164`)
- [ ] 2026. január (`kev_20260119_163`)

Minden lapszámnál külön figyelni:
- [ ] címlapsztori: helyes cím nagybetűkkel (a gépi kisbetűsítés elrontja a neveket), `weight` a címlaphoz
- [ ] kisbetűvel kezdődő leadek (mondat közepén kezdődő szöveg)
- [ ] rossz szerzők (pl. „feladatellátáshoz Szerdahelyi-Bánó Irén”, „nyár”, „j”)
- [ ] képaláírások, amik a szövegbe csúsztak
- [ ] túl rövid/semmitmondó nyomtatott címek („Advent”, „Bozsok”, „Falunap”) – webre beszédesebb cím

## 2. Mobil / dizájn (béta visszajelzések alapján)

- [ ] mobilos béta teszt: lendület, olvashatóság, betűméretek
- [ ] asztali fejléc: 1024–1280 px között a rovatmenü szűkös (vízszintes görgetés) – átnézni
- [ ] cikkoldal: galéria nézet a sok képes cikkekhez (pl. Fitt-Box, 50 éves találkozó)
- [ ] címlap: 40 000+ px hosszú mobilon – rovatonként kevesebb cikk vagy „Több” gomb?

## 3. Hirdetések

- [ ] Supabase: `ads` tábla létrehozása (`supabase_schema.sql` 10. pont)
- [ ] Supabase Storage: `ad-images` bucket a képfeltöltéshez
- [ ] hirdetői megállapodás: a nyomtatott hirdetések online is megjelenhetnek-e

## 4. Biztonság – élesítés előtt kötelező

- [ ] admin belépés valódi hitelesítéssel (most bármilyen jelszót elfogad) – Supabase Auth
- [ ] az admin csak bejelentkezve írhasson (RLS szabályok már készen vannak a sémában)

## 5. Technikai

- [ ] `README.md` átírása (most a Vite sablon szövege): adatlánc, futtatás, curation.json leírása
- [ ] régi admin fájlok lint-figyelmeztetései (fel nem használt importok)
- [ ] új lapszám felvételének folyamata (letöltés → szegmentálás → kézi javítás → build)
