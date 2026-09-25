// A nyomtatott lapszámokból előállított tartalom (scripts/build_site_data.py generálja).
import ARTICLES from '../data/articles.json';
import ISSUES from '../data/issues.json';
import SECTIONS from '../data/sections.json';

const MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július',
  'augusztus', 'szeptember', 'október', 'november', 'december'];

export const issues = ISSUES; // legfrissebb elöl
export const sections = SECTIONS;

const issueById = Object.fromEntries(ISSUES.map((i) => [i.id, i]));
const sectionBySlug = Object.fromEntries(SECTIONS.map((s) => [s.slug, s]));

// Cikkek: legfrissebb lapszám elöl, lapszámon belül a nyomtatott sorrendben
export const articles = [...ARTICLES].sort((a, b) =>
  a.date === b.date ? a.rank - b.rank : b.date.localeCompare(a.date)
);
const articleById = Object.fromEntries(articles.map((a) => [a.id, a]));

export const getArticle = (id) => articleById[id] || null;
export const getIssue = (id) => issueById[id] || null;
export const getSection = (slug) => sectionBySlug[slug] || null;
export const sectionName = (slug) => sectionBySlug[slug]?.name || 'Aktuális';

export const articlesOfIssue = (issueId) =>
  articles.filter((a) => a.issueId === issueId).sort((a, b) => a.rank - b.rank);

export const articlesOfSection = (slug) => articles.filter((a) => a.section === slug);

export const latestIssue = ISSUES.find((i) => i.articleCount > 0) || ISSUES[0];

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}. ${MONTHS[m - 1]} ${d}.`;
}

export function issueTitle(issue) {
  if (!issue) return '';
  const num = issue.number ? `, ${issue.number}. szám` : '';
  // a régi (heti) lapszámoknál a nap is kell: "1889. január 6., 1. szám"
  const day = issue.weekly ? ` ${issue.day}.` : '';
  return `${issue.year}. ${MONTHS[issue.month - 1]}${day}${num}`;
}

// A digitalizált archívum első és utolsó éve (a szövegekben: "1889-től")
export const ARCHIVE_FIRST_YEAR = Math.min(...ISSUES.map((i) => i.year));
export const ARCHIVE_LAST_YEAR = Math.max(...ISSUES.map((i) => i.year));

export const monthName = (m) => MONTHS[m - 1];

// A PDF-ek a Cloudflare R2-ből jönnek (az issues.json-ban már a végleges cím van)
export function pdfLink(issue, page) {
  if (!issue?.pdf) return null;
  return page ? `${issue.pdf}#page=${page}` : issue.pdf;
}

// A cikkek teljes szövege külön fájlban van (public/content/<id>.json), megnyitáskor töltődik be.
const bodyCache = new Map();
export function loadArticleBody(id) {
  if (!bodyCache.has(id)) {
    const p = fetch(`/content/${encodeURIComponent(id)}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => d.blocks);
    bodyCache.set(id, p);
    p.catch(() => bodyCache.delete(id));
  }
  return bodyCache.get(id);
}

// Előrendereléskor (és az előrenderelt oldalba ágyazva) a cikk szövege globálisan elérhető.
export function getPreloadedBody(id) {
  const pre = typeof globalThis !== 'undefined' ? globalThis.__KEV_PRELOAD__ : null;
  return pre && pre.id === id ? pre.blocks : null;
}
