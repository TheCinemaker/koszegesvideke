// Gyors füstteszt: az oldalak renderelése Node-ban (Vite SSR), hogy a futásidejű hibák kiderüljenek.
// Használat: node scripts/smoke-render.mjs
import { createServer } from 'vite';

const routes = ['/', '/rovat/sport', '/rovat/nemzetisegek', '/archivum', '/archivum/2015', '/kereses?q=jurisics', '/hirdetesek', '/impresszum', '/adatvedelem', '/sutik'];

globalThis.window = {
  location: { pathname: '/', search: '', hash: '' },
  history: { replaceState() {}, pushState() {} },
  innerHeight: 800,
  scrollY: 0,
  addEventListener() {},
  removeEventListener() {},
  scrollTo() {},
};
globalThis.document = { title: '', getElementById: () => null, head: { querySelector: () => null } };
globalThis.localStorage = { getItem: () => null, setItem() {} };

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let failed = 0;
try {
  const { renderToString } = await import('react-dom/server');
  const React = (await import('react')).default;
  const App = (await server.ssrLoadModule('/src/App.jsx')).default;
  const content = await server.ssrLoadModule('/src/lib/content.js');
  const extra = content.articles.slice(0, 40).map((a) => `/cikk/${a.id}`);
  extra.push(`/lapszam/${content.latestIssue.id}`);
  for (const r of [...routes, ...extra]) {
    const [pathname, search = ''] = r.split('?');
    window.location.pathname = pathname;
    window.location.search = search ? `?${search}` : '';
    try {
      const html = renderToString(React.createElement(App));
      if (html.length < 500) throw new Error('túl rövid kimenet');
    } catch (e) {
      failed++;
      console.error(`HIBA ${r}:`, e.message);
    }
  }
  console.log(`${routes.length + extra.length} útvonal, ${failed} hiba`);
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
