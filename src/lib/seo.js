// Oldalankénti meta-adatok: cím, leírás, kanonikus URL, Open Graph / Twitter kártya, JSON-LD.
// Ugyanezt használja az előrenderelés (scripts/prerender.mjs) és a böngésző is (useDocumentMeta).
import { getArticle, getIssue, getSection, sectionName, issueTitle, latestIssue, articles } from './content';
import { href } from './router';

// A végleges domain: Cloudflare Pages környezeti változó (VITE_SITE_URL), amíg nincs saját domain,
// addig a Pages alapértelmezett címe.
export const SITE_URL = (import.meta.env?.VITE_SITE_URL || 'https://koszegesvideke.pages.dev').replace(/\/$/, '');
export const SITE_NAME = 'Kőszeg és Vidéke';
const SITE_DESC =
  'Kőszeg és Vidéke – Kőszeg város és környéke polgárainak ingyenes havilapja. Friss helyi hírek, közélet, kultúra, sport és a digitalizált lapszámok (1889-től) kereshető archívuma.';
const DEFAULT_IMAGE = '/og-default.jpg';

const clean = (t) => (t || '').replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();

export function shorten(text, max = 158) {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–-]$/, '') + '…';
}

export const absUrl = (path) => (/^https?:/.test(path) ? path : SITE_URL + path);

const organization = {
  '@type': 'NewsMediaOrganization',
  '@id': `${SITE_URL}/#szervezet`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: absUrl('/crest.png') },
  foundingDate: '1881',
  publishingPrinciples: `${SITE_URL}/`,
};

export function getMeta(route) {
  const base = {
    title: `${SITE_NAME} – Kőszeg város és környéke havilapja`,
    description: SITE_DESC,
    path: '/',
    image: DEFAULT_IMAGE,
    type: 'website',
    robots: 'index, follow, max-image-preview:large',
    jsonld: [organization],
  };

  switch (route.name) {
    case 'home': {
      return {
        ...base,
        jsonld: [
          organization,
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#weboldal`,
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            inLanguage: 'hu-HU',
            publisher: { '@id': organization['@id'] },
            potentialAction: {
              '@type': 'SearchAction',
              target: `${SITE_URL}/kereses?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ],
      };
    }
    case 'cikk': {
      const a = getArticle(route.param);
      if (!a) return { ...base, title: `Az oldal nem található – ${SITE_NAME}`, robots: 'noindex' };
      const path = href('cikk', a.id);
      const image = a.images[0]?.src || DEFAULT_IMAGE;
      const issue = getIssue(a.issueId);
      return {
        ...base,
        title: `${clean(a.title)} – ${SITE_NAME}`,
        description: shorten(a.deck && a.deck.length > 60 ? a.deck : a.lead),
        path,
        image,
        type: 'article',
        article: { published: a.date, section: sectionName(a.section), author: a.author },
        jsonld: [
          organization,
          {
            '@type': 'NewsArticle',
            '@id': `${SITE_URL}${path}#cikk`,
            mainEntityOfPage: `${SITE_URL}${path}`,
            headline: clean(a.title).slice(0, 110),
            description: shorten(a.lead, 250),
            image: a.images.map((i) => absUrl(i.src)).slice(0, 5),
            datePublished: a.date,
            dateModified: a.date,
            inLanguage: 'hu-HU',
            articleSection: sectionName(a.section),
            author: a.author
              ? { '@type': 'Person', name: clean(a.author) }
              : { '@type': 'Organization', name: `${SITE_NAME} szerkesztősége` },
            publisher: { '@id': organization['@id'] },
            isPartOf: issue ? { '@type': 'PublicationIssue', name: `${SITE_NAME}, ${issueTitle(issue)}` } : undefined,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Címlap', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: sectionName(a.section), item: `${SITE_URL}${href('rovat', a.section)}` },
              { '@type': 'ListItem', position: 3, name: clean(a.title), item: `${SITE_URL}${path}` },
            ],
          },
        ],
      };
    }
    case 'rovat': {
      const s = getSection(route.param);
      if (!s) return { ...base, title: `Az oldal nem található – ${SITE_NAME}`, robots: 'noindex' };
      const first = articles.find((a) => a.section === s.slug && a.images.length);
      return {
        ...base,
        title: `${s.name} – ${SITE_NAME}`,
        description: `${s.name}: a Kőszeg és Vidéke friss cikkei Kőszegről és a környező településekről.`,
        path: href('rovat', s.slug),
        image: first?.images[0]?.src || DEFAULT_IMAGE,
      };
    }
    case 'lapszam': {
      const i = getIssue(route.param);
      if (!i) return { ...base, title: `Az oldal nem található – ${SITE_NAME}`, robots: 'noindex' };
      return {
        ...base,
        title: `${issueTitle(i)} lapszám – ${SITE_NAME}`,
        description: `A Kőszeg és Vidéke ${issueTitle(i)} lapszámának cikkei és az eredeti nyomtatott kiadás PDF-ben.`,
        path: href('lapszam', i.id),
        image: i.cover || DEFAULT_IMAGE,
      };
    }
    case 'archivum': {
      const y = route.param;
      return {
        ...base,
        title: y ? `${y}. évi lapszámok – Archívum – ${SITE_NAME}` : `Archívum – ${SITE_NAME}`,
        description: `A Kőszeg és Vidéke ${y ? `${y}. évben` : '1889 óta'} megjelent, digitalizált lapszámai PDF-ben, teljes szövegű kereséssel.`,
        path: href('archivum', y || undefined),
        image: latestIssue.cover || DEFAULT_IMAGE,
      };
    }
    case 'hirdetesek':
      return {
        ...base,
        title: `Hirdetések – Hirdessen nálunk – ${SITE_NAME}`,
        description: 'Helyi vállalkozások ajánlatai. Hirdessen a Kőszeg és Vidéke nyomtatott és online kiadásában!',
        path: href('hirdetesek'),
      };
    case 'impresszum':
    case 'adatvedelem':
    case 'sutik': {
      const titles = { impresszum: 'Impresszum', adatvedelem: 'Adatvédelmi tájékoztató', sutik: 'Süti-tájékoztató' };
      return {
        ...base,
        title: `${titles[route.name]} – ${SITE_NAME}`,
        description: `${titles[route.name]} – Kőszeg és Vidéke, kiadja a Jurisics-vár Művelődési Központ és Várszínház.`,
        path: href(route.name),
      };
    }
    case 'kereses':
      return { ...base, title: `Keresés – ${SITE_NAME}`, path: href('kereses'), robots: 'noindex, follow' };
    case 'kepellenorzes':
      return { ...base, title: `Fotóellenőrzés – ${SITE_NAME}`, path: href('kepellenorzes'), robots: 'noindex, nofollow' };
    case 'admin':
      return { ...base, title: `Szerkesztőség – ${SITE_NAME}`, path: href('admin'), robots: 'noindex, nofollow' };
    default:
      return { ...base, title: `Az oldal nem található – ${SITE_NAME}`, robots: 'noindex' };
  }
}

// <head> tartalma szövegként (előrendereléshez)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function headTags(meta) {
  const url = SITE_URL + meta.path;
  const img = absUrl(meta.image);
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${meta.robots}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="hu_HU" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:title" content="${esc(meta.title.replace(` – ${SITE_NAME}`, ''))}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  if (meta.article) {
    tags.push(`<meta property="article:published_time" content="${meta.article.published}" />`);
    tags.push(`<meta property="article:section" content="${esc(meta.article.section)}" />`);
    if (meta.article.author) tags.push(`<meta property="article:author" content="${esc(clean(meta.article.author))}" />`);
  }
  const graph = { '@context': 'https://schema.org', '@graph': meta.jsonld };
  tags.push(`<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`);
  return tags.join('\n    ');
}
