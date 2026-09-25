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

Javítva (09-25, felhasználói példák alapján): Sarjadó vetés (hirdetés volt a kép), Nyitott Porta Napok
(a borkirálynő-felhívás a Tóth Flóra-cikkhez került), Ostromnapok felvezető (plakát egészben látszik);
általánosan: a nyomtatott képkeret és árnyék automatikusan levágódik, a plakátszerű képek nem vágódnak le.

## Havi teendő új lapszámnál

1. PDF feltöltése a Cloudflare R2-be (`https://pub-fc6c9d1807b047e1bbddb255e30b9c50.r2.dev/<fájlnév>.pdf`)
2. `python scripts/segment_2026.py` → `scripts/detect_recurring_ads.py` → kézi javítások (`curation.json`)
3. Hirdetések: az új lapszám hirdetésterületei a `koszeg_es_videke_archive/articles_2026/print_ads.json`-ba
   (a Hirdetések oldal mindig a legfrissebb listát mutatja)
4. `python scripts/build_site_data.py` → `npm run build`

- [ ] R2 CORS: az `ExposeHeaders` listába `Accept-Ranges` (nem kötelező: a PDF-olvasó saját darabletöltővel
      enélkül is csak a nézett oldalakat tölti le)

## 0.5 SEO és Google (fontos: a Google azonnal találja meg)

- [x] **Útvonalak `#/cikk/...` helyett valódi URL-ekre (`/cikk/...`)** – a `#` utáni részt a Google NEM
      indexeli külön oldalként, így most egyetlen cikk sem kereshető. `src/lib/router.js` → History API,
      a tárhelyen minden útvonal az `index.html`-re essen (rewrite)
- [x] **Előrenderelés (prerender/SSR)** – `scripts/prerender.mjs`, `npm run build` futtatja;: minden cikkoldal kész HTML-ként legyen kiszolgálva, ne csak JS-ből
      (pl. `vite-plugin-ssr`/Vike, vagy build utáni statikus generálás a `scripts/smoke-render.mjs` alapján)
- [x] oldalanként saját `<title>`, `meta description`, kanonikus URL (`<link rel="canonical">`)
- [x] Open Graph + Twitter kártya (cím, bevezető, főkép) – Facebook-megosztáshoz is
- [x] strukturált adat (JSON-LD): `NewsArticle` (cím, dátum, szerző, kép), `NewsMediaOrganization`,
      `BreadcrumbList`, a címlapon `WebSite` + `SearchAction` (Google keresőmező)
- [x] `sitemap.xml` (minden cikk, rovat, lapszám) + `news-sitemap.xml` (Google News, utolsó 2 nap) – a
      `build_site_data.py` generálja
- [x] `robots.txt` a sitemap hivatkozással
- [ ] **Cloudflare Pages környezeti változó: `VITE_SITE_URL`** = a végleges domain (pl. `https://koszegesvideke.hu`),
      e nélkül a kanonikus URL-ek, a sitemap és az RSS a `https://koszegesvideke.pages.dev` címre mutatnak
- [x] `public/og-default.jpg` (1200×630), ikonok, favicon, manifest
- [ ] Google Search Console: tulajdon igazolása, sitemap beküldése; Google News Publisher Center
- [x] impresszum, adatvédelmi és süti-tájékoztató oldal (`src/content/legal/*.md`)
- [ ] **a jogi szövegeket és a kiadó elérhetőségeit (Rajnis u. 9., +36 94 360 113, jurisics@koszeg.hu)
      a kiadóval jóváhagyatni** – a cím és az e-mail a lapban nem szerepel, ellenőrizni kell
- [ ] Google Fonts helyett saját tárhelyről a betűk (adatvédelem: így nem megy IP-cím a Google-höz; gyorsabb is)
- [ ] látogatottságmérés: Cloudflare Web Analytics (sütimentes, nem kell hozzájárulás) vagy GA4 + süti-banner
- [ ] képek: `alt` szövegek, `width`/`height`, WebP/AVIF változat, `srcset` a mobilhoz
- [ ] Core Web Vitals / PageSpeed Insights mobilon: LCP, CLS mérése és javítása
- [x] RSS feed (`/rss.xml`) a friss cikkekhez
- [x] PWA manifest + ikonok (telepíthető) · [ ] offline olvasás (service worker)

## 1. Tartalom – kézi ellenőrzés (legfontosabb)

Lapszámonként: kontaktlap a képekről, hirdetések kiszűrése (`ads`), árva folytatások
összefűzése (`merge_into`), címek/szerzők javítása.

- [x] 2026. szeptember (`kev_20260914_172`)
- [x] 2026. augusztus (`kev_20260817_171`)
  - [ ] p08 árva vélemény (Móra Tímea) – cím hiányzik
  - [ ] p17 Ólmod / Fejlesztések (Bozsok) szövegei összekeveredtek
- [x] 2026. július (`kev_20260706_170`)
- [x] 2026. június (`kev_20260608_169`)
- [x] 2026. május (`kev_20260511_168`)
- [x] 2026. április (`kev_20260414_167`)
- [x] 2026. március (`kev_20260316_166`)
- [x] 2026. február (`kev_20260216_164`)
- [x] 2026. január (`kev_20260119_163`)

Mind a 9 lapszám átnézve (09-25): hirdetésképek, címlapsztorik, átnyúló cikkek, szerzők.
Finomhangolás a fotóellenőrző oldal (`/kepellenorzes`) jelölései alapján.

Minden lapszámnál külön figyelni (maradék, a jelölések alapján):
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
