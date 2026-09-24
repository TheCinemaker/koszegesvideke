import { useEffect, useState } from 'react';

// Hash-alapú útvonalak, hogy minden oldalnak megosztható címe legyen:
//   #/                     címlap
//   #/cikk/<id>            cikk
//   #/rovat/<slug>         rovat
//   #/lapszam/<id>         egy 2026-os lapszám cikkei
//   #/archivum[/<év>]      lapszám-archívum
//   #/kereses?q=<szöveg>   keresés
//   #/admin                szerkesztőség

export function parseHash(hash = window.location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { name: parts[0] || 'home', param: parts[1] || null, query };
}

export function href(name, param, query) {
  let h = '#/';
  if (name && name !== 'home') h += encodeURIComponent(name);
  if (param != null) h += '/' + encodeURIComponent(param);
  if (query) {
    const q = new URLSearchParams(query).toString();
    if (q) h += '?' + q;
  }
  return h;
}

export function navigate(name, param, query) {
  window.location.hash = href(name, param, query);
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
