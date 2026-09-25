// Előrenderelés a `vite build` után: minden oldal kész HTML-ként kerül a dist mappába
// (cím, leírás, kanonikus URL, megosztási adatok, JSON-LD és a cikkek teljes szövege),
// valamint sitemap.xml, news-sitemap.xml, robots.txt és rss.xml készül.
// Használat: npm run build   (vite build && node scripts/prerender.mjs)
import { createServer } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const template = readFileSync(join(DIST, 'index.html'), 'utf8');

// böngésző-környezet minimális utánzása a rendereléshez
globalThis.window = {
  location: { pathname: '/', search: '', hash: '' },
  history: { replaceState() {}, pushState() {} },
  addEventListener() {},
  removeEventListener() {},
  scrollTo() {},
  innerHeight: 800,
  scrollY: 0,
};
globalThis.document = { title: '', getElementById: () => null, head: { querySelector: () => null } };
globalThis.localStorage = { getItem: () => null, setItem() {} };

const server = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { renderToString } = await import('react-dom/server');
const React = (await import('react')).default;
const App = (await server.ssrLoadModule('/src/App.jsx')).default;
const content = await server.ssrLoadModule('/src/lib/content.js');
const seo = await server.ssrLoadModule('/src/lib/seo.js');
const { href } = await server.ssrLoadModule('/src/lib/router.js');
const { SITE_URL } = seo;

const routes = [
  { name: 'home' },
  { name: 'archivum' },
  { name: 'hirdetesek' },
  { name: 'impresszum' },
  { name: 'adatvedelem' },
  { name: 'sutik' },
  ...content.sections.map((s) => ({ name: 'rovat', param: s.slug })),
  ...content.issues.filter((i) => i.articleCount > 0).map((i) => ({ name: 'lapszam', param: i.id })),
  ...[...new Set(content.issues.map((i) => i.year))].map((y) => ({ name: 'archivum', param: String(y) })),
  ...content.articles.map((a) => ({ name: 'cikk', param: a.id })),
];

const escScript = (json) => JSON.stringify(json).replace(/</g, '\\u003c');
let count = 0;
for (const r of routes) {
  const path = href(r.name, r.param);
  window.location.pathname = path;
  window.location.search = '';
  let preload = '';
  globalThis.__KEV_PRELOAD__ = null;
  if (r.name === 'cikk') {
    const body = JSON.parse(readFileSync(join(ROOT, 'public', 'content', `${r.param}.json`), 'utf8'));
    globalThis.__KEV_PRELOAD__ = { id: r.param, blocks: body.blocks };
    preload = `<script>window.__KEV_PRELOAD__=${escScript(globalThis.__KEV_PRELOAD__)}</script>`;
  }
  const appHtml = renderToString(React.createElement(App));
  const meta = seo.getMeta({ name: r.name, param: r.param || null, query: {} });
  const html = template
    .replace(/<!--kev:head-->[\s\S]*?<!--\/kev:head-->/, seo.headTags(meta))
    .replace('<!--kev:app-->', appHtml)
    .replace('</body>', `${preload}\n  </body>`);
  // /cikk/<id> -> dist/cikk/<id>.html (Cloudflare Pages és a legtöbb tárhely perjel nélkül szolgálja ki)
  const out = path === '/' ? join(DIST, 'index.html') : join(DIST, `${decodeURIComponent(path)}.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  count++;
}

// ---- sitemap.xml ----
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const latestDate = content.articles[0]?.date || new Date().toISOString().slice(0, 10);
const urls = routes.map((r) => {
  const a = r.name === 'cikk' ? content.getArticle(r.param) : null;
  const i = r.name === 'lapszam' ? content.getIssue(r.param) : null;
  const lastmod = a?.date || i?.date || latestDate;
  const imgs = (a?.images || []).slice(0, 5)
    .map((im) => `\n    <image:image><image:loc>${xmlEsc(seo.absUrl(im.src))}</image:loc></image:image>`).join('');
  return `  <url>\n    <loc>${xmlEsc(SITE_URL + href(r.name, r.param))}</loc>\n    <lastmod>${lastmod}</lastmod>${imgs}\n  </url>`;
});
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`
);

// ---- news-sitemap.xml (Google News: a legfrissebb lapszám cikkei) ----
const newsItems = content.articles
  .filter((a) => a.issueId === content.latestIssue.id)
  .map(
    (a) => `  <url>
    <loc>${xmlEsc(SITE_URL + href('cikk', a.id))}</loc>
    <news:news>
      <news:publication><news:name>Kőszeg és Vidéke</news:name><news:language>hu</news:language></news:publication>
      <news:publication_date>${a.date}</news:publication_date>
      <news:title>${xmlEsc(a.title.replace(/­/g, ''))}</news:title>
    </news:news>
  </url>`
  );
writeFileSync(
  join(DIST, 'news-sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${newsItems.join('\n')}\n</urlset>\n`
);

// ---- robots.txt ----
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /kereses\nDisallow: /kepellenorzes\n\nSitemap: ${SITE_URL}/sitemap.xml\nSitemap: ${SITE_URL}/news-sitemap.xml\n`
);

// ---- rss.xml ----
const rfc822 = (d) => new Date(`${d}T08:00:00+02:00`).toUTCString();
const rssItems = content.articles.slice(0, 60).map((a) => {
  const link = SITE_URL + href('cikk', a.id);
  const img = a.images[0] ? `\n      <enclosure url="${xmlEsc(seo.absUrl(a.images[0].src))}" type="image/jpeg" length="0" />` : '';
  return `    <item>
      <title>${xmlEsc(a.title.replace(/­/g, ''))}</title>
      <link>${xmlEsc(link)}</link>
      <guid isPermaLink="true">${xmlEsc(link)}</guid>
      <pubDate>${rfc822(a.date)}</pubDate>
      <category>${xmlEsc(content.sectionName(a.section))}</category>
      <description>${xmlEsc(seo.shorten(a.lead, 400))}</description>${img}
    </item>`;
});
writeFileSync(
  join(DIST, 'rss.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kőszeg és Vidéke</title>
    <link>${SITE_URL}/</link>
    <description>Kőszeg város és környéke polgárainak ingyenes havilapja – friss cikkek</description>
    <language>hu</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${rssItems.join('\n')}
  </channel>
</rss>
`
);

await server.close();
console.log(`Előrenderelve: ${count} oldal · sitemap: ${urls.length} URL · news: ${newsItems.length} · rss: ${rssItems.length} · ${SITE_URL}`);
if (!existsSync(join(ROOT, 'public', 'og-default.jpg'))) {
  console.warn('Figyelem: hiányzik a public/og-default.jpg (alapértelmezett megosztási kép, 1200×630).');
}
