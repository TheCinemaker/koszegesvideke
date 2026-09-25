// Keresés: a 2026-os cikkekben (azonnal) és a teljes nyomtatott archívumban (1889-től, oldalanként).
// Ékezetfüggetlen: a „koszeg” megtalálja a „Kőszeg” szót is.
import MANIFEST from '../data/searchManifest.json';
import { articles } from './content';

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

export function snippet(text, folded, terms, radius = 130) {
  let pos = -1;
  for (const t of terms) {
    pos = folded.indexOf(t);
    if (pos >= 0) break;
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
const yearCache = new Map();

export const archiveYears = MANIFEST.map((m) => m.year).sort((a, b) => b - a);

async function loadYear(year) {
  if (!yearCache.has(year)) {
    const entry = MANIFEST.find((m) => m.year === year);
    const p = fetch(entry.file)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((items) =>
        items.map((it) => ({ issueId: it.i, pages: it.p.map((t) => ({ text: t, folded: fold(t) })) }))
      );
    yearCache.set(year, p);
    p.catch(() => yearCache.delete(year));
  }
  return yearCache.get(year);
}

// Évenként halad (legfrissebbtől), és minden év után visszajelez, így az eredmények fokozatosan jelennek meg.
export async function searchArchive(q, { years = archiveYears, onProgress, signal } = {}) {
  const terms = queryTerms(q);
  if (!terms.length) return [];
  const results = [];
  for (const year of years) {
    if (signal?.aborted) return results;
    const items = await loadYear(year);
    for (const issue of items) {
      issue.pages.forEach((pg, idx) => {
        if (!terms.every((t) => pg.folded.includes(t))) return;
        let hits = 0;
        for (const t of terms) hits += pg.folded.split(t).length - 1;
        results.push({ issueId: issue.issueId, year, page: idx + 1, hits, snippet: snippet(pg.text, pg.folded, terms) });
      });
    }
    results.sort((a, b) => b.year - a.year || b.issueId.localeCompare(a.issueId) || a.page - b.page);
    onProgress?.([...results], year);
  }
  return results;
}
