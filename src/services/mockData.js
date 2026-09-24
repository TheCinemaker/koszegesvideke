// A szerkesztőségi felület kiinduló adatai – a nyomtatott lapszámokból előállított tartalomból
// (src/data/*.json, scripts/build_site_data.py generálja).
import ARTICLES from '../data/articles.json';
import ISSUES from '../data/issues.json';
import SECTIONS from '../data/sections.json';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const blocksToHtml = (blocks) =>
  blocks
    .map((b) => {
      if (b.type === 'h3') return `<h3>${esc(b.text)}</h3>`;
      if (b.type === 'box') return `<blockquote>${(b.items || []).map((x) => esc(x.text)).join('<br>')}</blockquote>`;
      return `<p>${esc(b.text)}</p>`;
    })
    .join('\n');

export const INITIAL_CATEGORIES = SECTIONS.map((s) => ({ id: s.slug, name: s.name, slug: s.slug }));

const authorNames = [...new Set(ARTICLES.map((a) => a.author).filter(Boolean))];
export const INITIAL_AUTHORS = authorNames.map((name, i) => ({
  id: `auth-${i + 1}`,
  name,
  role: 'szerzo',
  bio: `${name} – a Kőszeg és Vidéke szerzője`,
}));
const authorId = Object.fromEntries(INITIAL_AUTHORS.map((a) => [a.name, a.id]));

export const INITIAL_ISSUES = ISSUES.map((i) => ({
  id: i.id,
  year: i.year,
  month: i.month,
  issue_number: i.number || i.serial,
  publication_date: i.date,
  title: `Kőszeg és Vidéke – ${i.label}`,
  cover_image: i.cover,
  pdf_url: i.pdf,
  status: 'published',
  page_count: i.pages,
}));

export const INITIAL_ARTICLES = ARTICLES.map((a) => ({
  id: a.id,
  slug: a.slug,
  title: a.title,
  subtitle: a.deck || '',
  lead: a.lead,
  // a teljes szöveg külön fájlban van (public/content); a szerkesztőben a bevezető jelenik meg
  content: a.blocks ? blocksToHtml(a.blocks) : `<p>${esc(a.lead || '')}</p>`,
  category_id: a.section,
  author_id: authorId[a.author] || null,
  issue_id: a.issueId,
  cover_image: a.images[0]?.src || '',
  status: 'published',
  created_at: a.date,
  published_at: a.date,
  order_index: a.rank + 1,
}));
