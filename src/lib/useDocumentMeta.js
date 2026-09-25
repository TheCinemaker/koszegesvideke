import { useEffect } from 'react';
import { getMeta, SITE_URL, absUrl, SITE_NAME } from './seo';

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// Navigáláskor frissíti a böngészőben a címet, leírást, kanonikus URL-t és a megosztási adatokat.
// (Az előrenderelt HTML-ben ezek már a szerveroldalon benne vannak.)
export function useDocumentMeta(route) {
  const key = `${route.name}/${route.param || ''}`;
  useEffect(() => {
    const meta = getMeta(route);
    document.title = meta.title;
    setMeta('name', 'description', meta.description);
    setMeta('name', 'robots', meta.robots);
    setMeta('property', 'og:title', meta.title.replace(` – ${SITE_NAME}`, ''));
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', SITE_URL + meta.path);
    setMeta('property', 'og:image', absUrl(meta.image));
    setMeta('property', 'og:type', meta.type);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = SITE_URL + meta.path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
