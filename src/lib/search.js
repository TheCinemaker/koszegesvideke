// Keresés: a 2026-os cikkekben (azonnal) és a teljes nyomtatott archívumban (1889-től, oldalanként).
// Ékezetfüggetlen: a „koszeg” megtalálja a „Kőszeg” szót is.
import MANIFEST from '../data/searchManifest.json';
import { articles, getIssue } from './content';

const FOLD = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o', ú: 'u', ü: 'u', ű: 'u',
  ä: 'a', à: 'a', â: 'a', è: 'e', ê: 'e', ë: 'e', ô: 'o', õ: 'o', û: 'u', ù: 'u',
  č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd', ß: 's',
};

// Karakterszám-tartó egyszerűsítés, így a találat helye az eredeti szövegben is ugyanott van.
export function fold(text) {
  let out = '';
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    out += FOLD[c] || c;
  }
  return out;
}

export function queryTerms(q) {
  return fold(q.trim())
    .split(/\s+/)
    .map((t) => t.replace(/^[„"'(]+|[”"'),.;:!?]+$/g, ''))
    .filter((t) => t.length >= 2);
}

export function snippet(text, folded, terms, radius = 130, at = -1) {
  let pos = at;
  for (const t of terms) {
    if (pos >= 0) break;
    pos = folded.indexOf(t);
  }
  if (pos < 0) return text.slice(0, radius * 2);
  let start = Math.max(0, pos - radius);
  let end = Math.min(text.length, pos + radius);
  if (start > 0) {
    const sp = text.indexOf(' ', start);
    if (sp > 0 && sp < pos) start = sp + 1;
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(' ', end);
    if (sp > pos) end = sp;
  }
  return (start > 0 ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : '');
}

// ---- 2026-os cikkek ----
// A cikkek teljes szövege a kereséshez külön fájlból (public/content/search-2026.json) töltődik be.
let articleIndexPromise = null;
function loadArticleIndex() {
  if (!articleIndexPromise) {
    articleIndexPromise = fetch('/content/search-2026.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((rows) => {
        const bodies = Object.fromEntries(rows.map((r) => [r.id, r.t]));
        return articles.map((a) => {
          const full = [a.title, a.deck, a.kicker, a.author, bodies[a.id] || a.lead]
            .filter(Boolean)
            .join(' ')
            .replace(/­/g, '');
          return { a, title: fold(a.title), full, folded: fold(full) };
        });
      });
  }
  return articleIndexPromise;
}

export async function searchArticles(q) {
  const terms = queryTerms(q);
  if (!terms.length) return [];
  const index = await loadArticleIndex();
  const res = [];
  for (const it of index) {
    if (!terms.every((t) => it.folded.includes(t))) continue;
    let score = 0;
    for (const t of terms) {
      if (it.title.includes(t)) score += 10;
      score += Math.min(5, it.folded.split(t).length - 1);
    }
    res.push({ article: it.a, score, snippet: snippet(it.full, it.folded, terms) });
  }
  return res.sort((x, y) => y.score - x.score || y.article.date.localeCompare(x.article.date));
}

// ---- Nyomtatott archívum ----
// Szóindex (scripts/build_site_data.py → build_search): egy keresés csak a szavak 1–3 vödrét tölti le,
// a kivonatokhoz pedig csak a megjelenített találatok lapszámának szövegét.
export const archiveYears = [...MANIFEST.years].sort((a, b) => b - a);

const WORD = /[\p{L}\p{N}]+/gu;

// FNV-1a a szó első 3 betűjén – egyezik a Python oldali search_bucket-tel
function bucketOf(word) {
  const key = word.slice(0, 3);
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % MANIFEST.buckets;
}

const cache = new Map();
function getJson(url) {
  if (!cache.has(url)) {
    const p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    cache.set(url, p);
    p.catch(() => cache.delete(url));
  }
  return cache.get(url);
}

// oldal-sorszám → { issueId, page }
let docsPromise = null;
function loadDocs() {
  if (!docsPromise) {
    docsPromise = getJson('/search/docs.json').then((rows) => {
      const out = [];
      for (const [issueId, n] of rows) for (let p = 1; p <= n; p++) out.push({ issueId, page: p, year: Number(issueId.slice(4, 8)) });
      return out;
    });
    docsPromise.catch(() => (docsPromise = null));
  }
  return docsPromise;
}

function decode(list) {
  const out = [];
  let d = 0;
  for (const part of list.split(',')) {
    d += parseInt(part, 36);
    out.push(d);
  }
  return out;
}

// Egy keresőszó oldalai: minden szó, ami így kezdődik (a kétbetűseknél csak a pontos egyezés)
async function docsForWord(word) {
  const bucket = await getJson(`/search/idx/${bucketOf(word)}.json`);
  const set = new Set();
  if (word.length < 3) {
    if (bucket[word]) for (const d of decode(bucket[word])) set.add(d);
    return set;
  }
  for (const w in bucket) {
    if (w.startsWith(word)) for (const d of decode(bucket[w])) set.add(d);
  }
  return set;
}

const archiveWords = (q) =>
  [...new Set(queryTerms(q).flatMap((t) => t.match(WORD) || []))].filter((w) => w.length >= 2);

// Találatok a legfrissebbtől: [{ issueId, year, page }]
// Több szónál: azok az oldalak, ahol mind szerepel – és az egybeírt alak is („tűzoltó autó” → „tűzoltóautó”).
export async function searchArchive(q, { year } = {}) {
  const words = archiveWords(q);
  if (!words.length) return [];
  const [docs, joined, ...sets] = await Promise.all([
    loadDocs(),
    words.length > 1 ? docsForWord(words.join('')) : Promise.resolve(new Set()),
    ...words.map(docsForWord),
  ]);
  sets.sort((a, b) => a.size - b.size);
  const found = new Set(joined);
  for (const d of sets[0]) if (sets.every((s) => s.has(d))) found.add(d);
  const res = [];
  for (const d of found) {
    const doc = docs[d];
    // a cikkekre bontott (2026-os) lapszámok a „Cikkek” találatai között már szerepelnek
    if (doc && (!year || doc.year === year) && !(getIssue(doc.issueId)?.articleCount > 0)) res.push({ ...doc });
  }
  return res.sort((a, b) => b.issueId.localeCompare(a.issueId) || a.page - b.page);
}

// Több szavas keresésnél (pl. névre): hol állnak a szavak egymás közelében – legfeljebb 2 szó köztük,
// bármilyen sorrendben („Avar Szilveszter”, „Avar »Baba« Szilveszter”, „Szilveszter Avar”).
// Ehhez a találatok lapszámainak szövege kell: adagokban, a legfrissebbtől tölti le, és minden adag után
// visszajelez (onProgress), így a pontos egyezések folyamatosan kerülnek előre. Biztonsági felső korlát: MAX_PROXIMITY_ISSUES.
const MAX_PROXIMITY_ISSUES = 600;
const BATCH = 12; // lapszám / adag (az adagban csak a találati oldalak töltődnek le)

// egy újságoldal szövege (oldalanként külön fájl, gyorsítótárazva)
const pageText = (h) => getJson(`/search/t/${h.issueId}/${h.page}.json`).catch(() => '');

function findNear(folded, words) {
  const joined = words.join('');
  const toks = [...folded.matchAll(/[\p{L}\p{N}]+/gu)];
  const span = words.length + 2;
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i][0];
    if (w.startsWith(joined)) return toks[i].index;
    if (!words.some((t) => w.startsWith(t))) continue;
    const win = toks.slice(i, i + span).map((m) => m[0]);
    if (words.every((t) => win.some((x) => x.startsWith(t)))) return toks[i].index;
  }
  return -1;
}

export async function rankByProximity(hits, q, { onProgress, signal } = {}) {
  const words = archiveWords(q);
  if (words.length < 2) return { near: hits, far: [], checked: false };
  const issueIds = [...new Set(hits.map((h) => h.issueId))].slice(0, MAX_PROXIMITY_ISSUES);
  const byIssue = hits.reduce((m, h) => m.set(h.issueId, [...(m.get(h.issueId) || []), h]), new Map());
  const nearKeys = new Map();
  for (let i = 0; i < issueIds.length; i += BATCH) {
    if (signal?.aborted) break;
    const pages = issueIds.slice(i, i + BATCH).flatMap((id) => byIssue.get(id));
    const texts = await Promise.all(pages.map((h) => pageText(h)));
    pages.forEach((h, k) => {
      const pos = findNear(fold(texts[k]), words);
      if (pos >= 0) nearKeys.set(`${h.issueId}/${h.page}`, pos);
    });
    const done = Math.min(i + BATCH, issueIds.length);
    onProgress?.(split(hits, nearKeys), { done, total: issueIds.length });
  }
  return { ...split(hits, nearKeys), checked: true };
}

function split(hits, nearKeys) {
  const near = [];
  const far = [];
  for (const h of hits) {
    const pos = nearKeys.get(`${h.issueId}/${h.page}`);
    if (pos != null) near.push({ ...h, pos });
    else far.push(h);
  }
  return { near, far };
}

// Kivonat egy találathoz (a lapszám szövege egyszer töltődik le, utána gyorsítótárból);
// pontos egyezésnél a kivonat az egyezés helyére ugrik
export async function archiveSnippet(hit, terms) {
  const text = await pageText(hit);
  return snippet(text, fold(text), terms, 130, hit.pos ?? -1);
}
