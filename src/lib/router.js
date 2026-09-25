import { useEffect, useState } from 'react';

// Valódi URL-ek (History API), hogy a Google minden oldalt külön indexelhessen:
//   /                      címlap
//   /cikk/<id>             cikk
//   /rovat/<slug>          rovat
//   /lapszam/<id>          egy 2026-os lapszám cikkei
//   /archivum[/<év>]       lapszám-archívum
//   /kereses?q=<szöveg>    keresés
//   /hirdetesek            hirdetések
//   /admin                 szerkesztőség
// A régi #/... linkek automatikusan átirányítanak az új címre.

const NAV_EVENT = 'kev:navigate';

export function parseLocation(loc = typeof window !== 'undefined' ? window.location : { pathname: '/', search: '' }) {
  const parts = loc.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(loc.search));
  return { name: parts[0] || 'home', param: parts[1] || null, query };
}

export function href(name, param, query) {
  let h = '/';
  if (name && name !== 'home') h += encodeURIComponent(name);
  if (param != null) h += '/' + encodeURIComponent(param);
  if (query) {
    const q = new URLSearchParams(query).toString();
    if (q) h += '?' + q;
  }
  return h;
}

export function navigate(name, param, query, { replace = false } = {}) {
  go(href(name, param, query), { replace });
}

export function go(url, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(NAV_EVENT));
}

// régi hash-es linkek (#/cikk/...) átirányítása
function upgradeHashUrl() {
  const h = window.location.hash;
  if (h.startsWith('#/')) window.history.replaceState(null, '', h.slice(1) || '/');
}

// belső linkekre kattintáskor nem töltjük újra az oldalt
function onDocumentClick(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest?.('a[href]');
  if (!a || a.target || a.hasAttribute('download') || a.getAttribute('rel')?.includes('external')) return;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  // a statikus fájlok (PDF, JSON, képek) nem útvonalak
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;
  e.preventDefault();
  if (url.pathname + url.search !== window.location.pathname + window.location.search) {
    go(url.pathname + url.search);
  }
}

export function useRoute() {
  const [route, setRoute] = useState(() => {
    if (typeof window !== 'undefined') upgradeHashUrl();
    return parseLocation();
  });
  useEffect(() => {
    const onChange = () => setRoute(parseLocation());
    window.addEventListener('popstate', onChange);
    window.addEventListener(NAV_EVENT, onChange);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener(NAV_EVENT, onChange);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);
  return route;
}
