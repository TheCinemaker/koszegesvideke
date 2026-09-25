import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ArticleCard } from '../components/ArticleCard';
import { href, navigate } from '../lib/router';
import { getIssue, issueTitle, pdfLink, ARCHIVE_FIRST_YEAR, ARCHIVE_LAST_YEAR } from '../lib/content';
import { searchArticles, searchArchive, archiveYears, fold, queryTerms } from '../lib/search';

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

export const SearchPage = ({ query }) => {
  const q = (query.q || '').trim();
  const yearFilter = query.ev ? Number(query.ev) : null;
  // Az oldal minden új keresésnél újraépül (App: key), így az állapot mindig tiszta.
  const terms = useMemo(() => queryTerms(q), [q]);
  const [input, setInput] = useState(q);
  const [archive, setArchive] = useState([]);
  const [loadedYear, setLoadedYear] = useState(null);
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
    const ctrl = new AbortController();
    searchArchive(q, {
      years: yearFilter ? [yearFilter] : archiveYears,
      signal: ctrl.signal,
      onProgress: (res, year) => {
        if (!ctrl.signal.aborted) {
          setArchive(res);
          setLoadedYear(year);
        }
      },
    })
      .catch(() => !ctrl.signal.aborted && setError('Az archívum betöltése nem sikerült. Kérjük, próbálja újra.'))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
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
        <div className="mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex sm:flex-wrap items-center gap-2 text-[15px] overflow-x-auto no-scrollbar">
          <span className="meta shrink-0">Archívum éve:</span>
          <button type="button" onClick={() => setYear(null)} className={`shrink-0 px-2.5 py-1 rounded border ${!yearFilter ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-line)]'}`}>
            Mind
          </button>
          {archiveYears.map((y) => (
            <button key={y} type="button" onClick={() => setYear(y)} className={`shrink-0 px-2.5 py-1 rounded border ${yearFilter === y ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-line)]'}`}>
              {y}
            </button>
          ))}
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
                {archive.length} oldal{loading ? ` · keresés… (${loadedYear ?? ''})` : ''}
              </span>
            </div>
            {error && <p className="text-[17px] text-red-700">{error}</p>}
            {!loading && !error && archive.length === 0 && (
              <p className="text-[17px] text-[var(--color-ink-2)]">Nincs találat a nyomtatott lapszámokban.</p>
            )}
            <ol>
              {archive.slice(0, shown).map((r) => {
                const issue = getIssue(r.issueId);
                return (
                  <li key={`${r.issueId}-${r.page}`} className="py-4 border-b border-[var(--color-line)]">
                    <a className="headline-link block" href={pdfLink(issue, r.page)} target="_blank" rel="noopener noreferrer">
                      <p className="headline text-[19px]">
                        {issueTitle(issue)} · {r.page}. oldal
                      </p>
                    </a>
                    <p className="text-[16px] leading-relaxed text-[var(--color-ink-2)] mt-1 font-serif">
                      <Highlight text={r.snippet} terms={terms} />
                    </p>
                    <p className="meta mt-1">
                      <a className="underline" href={pdfLink(issue, r.page)} target="_blank" rel="noopener noreferrer">Oldal megnyitása (PDF)</a>
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
              })}
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
