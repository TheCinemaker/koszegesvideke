import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { ArticleCard } from '../components/ArticleCard';
import { href, navigate } from '../lib/router';
import { getIssue, issueTitle, pdfLink, ARCHIVE_FIRST_YEAR, ARCHIVE_LAST_YEAR } from '../lib/content';
import { searchArticles, searchArchive, archiveSnippet, archiveYears, fold, queryTerms } from '../lib/search';

// A találati szavak kiemelése a kivonatban (ékezetfüggetlenül)
const Highlight = ({ text, terms }) => {
  if (!terms.length) return text;
  const folded = fold(text);
  const marks = [];
  for (const t of terms) {
    let i = folded.indexOf(t);
    while (i >= 0) {
      marks.push([i, i + t.length]);
      i = folded.indexOf(t, i + t.length);
    }
  }
  marks.sort((a, b) => a[0] - b[0]);
  const out = [];
  let pos = 0;
  marks.forEach(([s, e], k) => {
    if (s < pos) return;
    out.push(text.slice(pos, s));
    out.push(<mark key={k}>{text.slice(s, e)}</mark>);
    pos = e;
  });
  out.push(text.slice(pos));
  return out;
};

const PAGE_SIZE = 30;

// Egy archív találat: a kivonat csak megjelenítéskor töltődik be (a lapszám szövegéből)
const ArchiveHit = ({ hit, terms }) => {
  const issue = getIssue(hit.issueId);
  const [text, setText] = useState(null);
  const [near, setNear] = useState(false);
  const ref = useRef(null);
  // a kivonat (a lapszám szövege) csak akkor töltődik le, ha a találat a képernyő közelébe ér
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return undefined;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  useEffect(() => {
    if (!near) return undefined;
    let alive = true;
    archiveSnippet(hit, terms)
      .then((t) => alive && setText(t))
      .catch(() => alive && setText(''));
    return () => {
      alive = false;
    };
  }, [hit, terms, near]);
  if (!issue) return null;
  return (
    <li ref={ref} className="py-4 border-b border-[var(--color-line)]">
      <a className="headline-link block" href={pdfLink(issue, hit.page)} target="_blank" rel="noopener noreferrer">
        <p className="headline text-[19px]">
          {issueTitle(issue)} · {hit.page}. oldal
        </p>
      </a>
      {text === null ? (
        <div className="mt-2 space-y-2" aria-hidden="true">
          <div className="h-3.5 rounded bg-[var(--color-line)] w-full" />
          <div className="h-3.5 rounded bg-[var(--color-line)] w-4/5" />
        </div>
      ) : (
        text && (
          <p className="text-[16px] leading-relaxed text-[var(--color-ink-2)] mt-1 font-serif">
            <Highlight text={text} terms={terms} />
          </p>
        )
      )}
      <p className="meta mt-1">
        <a className="underline" href={pdfLink(issue, hit.page)} target="_blank" rel="noopener noreferrer">Oldal megnyitása (PDF)</a>
        {issue.source && <span> · Digitalizálta: {issue.source}</span>}
        {issue.articleCount > 0 && (
          <>
            {' · '}
            <a className="underline" href={href('lapszam', issue.id)}>A lapszám cikkei</a>
          </>
        )}
      </p>
    </li>
  );
};

export const SearchPage = ({ query }) => {
  const q = (query.q || '').trim();
  const yearFilter = query.ev ? Number(query.ev) : null;
  // Az oldal minden új keresésnél újraépül (App: key), így az állapot mindig tiszta.
  const terms = useMemo(() => queryTerms(q), [q]);
  const [input, setInput] = useState(q);
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(terms.length > 0);
  const [error, setError] = useState(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [articleHits, setArticleHits] = useState([]);

  useEffect(() => {
    if (!terms.length) return undefined;
    let alive = true;
    searchArticles(q).then((res) => alive && setArticleHits(res));
    return () => {
      alive = false;
    };
  }, [q, terms.length]);

  useEffect(() => {
    if (!terms.length) return undefined;
    let alive = true;
    searchArchive(q, { year: yearFilter })
      .then((res) => alive && setArchive(res))
      .catch(() => alive && setError('Az archívum betöltése nem sikerült. Kérjük, próbálja újra.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [q, yearFilter, terms.length]);

  const submit = (e) => {
    e.preventDefault();
    navigate('kereses', null, input.trim() ? { q: input.trim(), ...(yearFilter ? { ev: yearFilter } : {}) } : null);
  };

  const setYear = (y) => navigate('kereses', null, { q, ...(y ? { ev: y } : {}) });

  return (
    <div className="container-news pt-8 max-w-[900px]">
      <h1 className="text-[36px] sm:text-[42px] leading-tight">Keresés</h1>
      <p className="text-[17px] text-[var(--color-ink-2)] mt-2">
        Keres a 2026-os cikkekben és a digitalizált lapszámok ({ARCHIVE_FIRST_YEAR}-től) teljes szövegében. Ékezet nélkül is kereshet.
      </p>

      <form onSubmit={submit} className="mt-5 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Keresett kifejezés</label>
        <div className="relative flex-1">
          <input
            id="q"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pl. Jurisics, ostromnapok, szüret"
            className="w-full pl-11 pr-3 py-3 text-[18px] border-2 border-[var(--color-line)] rounded-md focus:outline-none focus:border-[var(--color-brand)]"
            autoFocus
          />
          <Search className="w-5 h-5 text-[var(--color-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
        </div>
        <button className="btn btn-primary text-[17px] px-5" type="submit">Keresés</button>
      </form>

      {q && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[15px]">
          <label htmlFor="ev" className="meta">Archívum éve:</label>
          <button type="button" onClick={() => setYear(null)} className={`px-2.5 py-1 rounded border ${!yearFilter ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-line)]'}`}>
            Mind
          </button>
          <select
            id="ev"
            value={yearFilter || ''}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
            className={`px-2 py-1 rounded border bg-white text-[15px] ${yearFilter ? 'border-[var(--color-ink)] font-semibold' : 'border-[var(--color-line)]'}`}
          >
            <option value="">Válasszon évet…</option>
            {archiveYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {q && terms.length === 0 && <p className="mt-8 text-[18px]">Legalább két betűt írjon be.</p>}

      {terms.length > 0 && (
        <>
          <section className="mt-10" aria-labelledby="cikk-talalatok">
            <div className="rule-heading">
              <h2 id="cikk-talalatok">Cikkek (2026)</h2>
              <span className="meta">{articleHits.length} találat</span>
            </div>
            {articleHits.length === 0 ? (
              <p className="text-[17px] text-[var(--color-ink-2)]">Nincs találat a 2026-os cikkek között.</p>
            ) : (
              articleHits.slice(0, 20).map(({ article, snippet }) => (
                <div key={article.id}>
                  <ArticleCard article={{ ...article, lead: null }} variant="row" showLead={false} />
                  <p className="lead-text text-[16px] -mt-3 mb-4 text-[var(--color-ink-2)]">
                    <Highlight text={snippet} terms={terms} />
                  </p>
                </div>
              ))
            )}
          </section>

          <section className="mt-12" aria-labelledby="archiv-talalatok" aria-busy={loading}>
            <div className="rule-heading">
              <h2 id="archiv-talalatok">Nyomtatott lapszámok{yearFilter ? ` (${yearFilter})` : ` (${ARCHIVE_FIRST_YEAR}–${ARCHIVE_LAST_YEAR})`}</h2>
              <span className="meta" aria-live="polite">
                {loading ? 'keresés…' : `${archive.length} oldal`}
              </span>
            </div>
            {error && <p className="text-[17px] text-red-700">{error}</p>}
            {!loading && !error && archive.length === 0 && (
              <p className="text-[17px] text-[var(--color-ink-2)]">Nincs találat a nyomtatott lapszámokban.</p>
            )}
            <ol>
              {archive.slice(0, shown).map((r) => (
                <ArchiveHit key={`${r.issueId}-${r.page}`} hit={r} terms={terms} />
              ))}
            </ol>
            {archive.length > shown && (
              <button type="button" className="btn mt-6" onClick={() => setShown((s) => s + PAGE_SIZE)}>
                További találatok ({archive.length - shown})
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
};
