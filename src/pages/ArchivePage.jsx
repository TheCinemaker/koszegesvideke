import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IssueCover } from '../components/IssueCover';
import { href } from '../lib/router';
import { issues, monthName } from '../lib/content';
import { Stats } from '../components/Stats';

// Archívum: évtized → év → hónaponként csoportosított lapszámok.
// (A korábbi 70 gombos évsor helyett: egy sor évtized, alatta az évtized évei a lapszámok számával.)

const countByYear = issues.reduce((m, i) => m.set(i.year, (m.get(i.year) || 0) + 1), new Map());
const YEARS = [...countByYear.keys()].sort((a, b) => a - b);
const DECADES = [...new Set(YEARS.map((y) => Math.floor(y / 10) * 10))];

// „1890-es”, „1900-as”, „2010-es”: a toldalék a kiejtett utolsó tagtól függ (tíz, húsz, …, száz, ezer)
const TENS = ['', 'es', 'as', 'as', 'es', 'es', 'as', 'es', 'as', 'es'];
const decadeName = (d) => {
  const t = Math.floor(d / 10) % 10;
  const suffix = t ? TENS[t] : Math.floor(d / 100) % 10 ? 'as' : 'es';
  return `${d}-${suffix}`;
};

const YearNav = ({ active }) => {
  const i = YEARS.indexOf(active);
  const prev = YEARS[i - 1];
  const next = YEARS[i + 1];
  const cls = 'inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[var(--color-line)] text-[15px] font-semibold hover:border-[var(--color-ink)]';
  return (
    <div className="flex items-center justify-between gap-3">
      {prev ? (
        <a className={cls} href={href('archivum', prev)} aria-label={`Előző év: ${prev}`}>
          <ChevronLeft className="w-4 h-4" aria-hidden="true" /> {prev}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a className={cls} href={href('archivum', next)} aria-label={`Következő év: ${next}`}>
          {next} <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </a>
      ) : (
        <span />
      )}
    </div>
  );
};

export const ArchivePage = ({ year }) => {
  const active = countByYear.has(Number(year)) ? Number(year) : YEARS[YEARS.length - 1];
  const decade = Math.floor(active / 10) * 10;
  const decadeYears = YEARS.filter((y) => Math.floor(y / 10) * 10 === decade);
  const list = issues.filter((i) => i.year === active).sort((a, b) => a.date.localeCompare(b.date));
  const byMonth = list.reduce((m, i) => m.set(i.month, [...(m.get(i.month) || []), i]), new Map());
  const weekly = list.some((i) => i.weekly);
  const fromLibrary = list.some((i) => i.source);

  // mobilon az évtizedsor oldalra görgethető: a kiválasztott évtized legyen látható (az oldal nem ugrik)
  const decadeBar = useRef(null);
  useEffect(() => {
    const bar = decadeBar.current;
    const on = bar?.querySelector('[aria-current]');
    if (bar && on && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2;
  }, [decade]);

  return (
    <div className="container-news pt-8">
      <header className="border-b-2 border-[var(--color-ink)] pb-4 mb-6">
        <h1 className="text-[36px] sm:text-[44px] leading-tight">Archívum</h1>
        <p className="text-[17px] text-[var(--color-ink-2)] mt-2 max-w-[70ch] leading-relaxed">
          A Kőszeg és Vidéke {issues.length.toLocaleString('hu-HU')} digitalizált lapszáma ({YEARS[0]}–{YEARS[YEARS.length - 1]}). Válasszon
          évtizedet és évet – vagy keressen a teljes szövegben a <a className="text-[var(--color-brand)] underline" href={href('kereses')}>keresővel</a>.
        </p>
        <div className="mt-3">
          <Stats compact />
        </div>
      </header>

      {/* 1. évtizedek */}
      <nav ref={decadeBar} aria-label="Évtizedek" className="relative -mx-4 px-4 overflow-x-auto no-scrollbar mb-4 sm:mx-0 sm:px-0 sm:overflow-visible">
        <ul className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
          {DECADES.map((d) => {
            const target = YEARS.filter((y) => Math.floor(y / 10) * 10 === d);
            const on = d === decade;
            return (
              <li key={d}>
                <a
                  href={href('archivum', on ? active : target[target.length - 1])}
                  aria-current={on ? 'true' : undefined}
                  className={`block px-3.5 py-1.5 rounded-full border text-[15px] font-semibold whitespace-nowrap ${on ? 'bg-[var(--color-ink)] border-[var(--color-ink)] text-white' : 'bg-white border-[var(--color-line)] hover:border-[var(--color-ink)]'}`}
                >
                  {decadeName(d)}
                  <span className="sm:hidden"> évek</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 2. az évtized évei, a lapszámok számával */}
      <nav aria-label={`${decadeName(decade)} évek`} className="mb-8">
        <ul className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {decadeYears.map((y) => {
            const on = y === active;
            return (
              <li key={y}>
                <a
                  href={href('archivum', y)}
                  aria-current={on ? 'page' : undefined}
                  className={`flex flex-col items-center rounded-md border py-1.5 ${on ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white' : 'border-[var(--color-line)] hover:border-[var(--color-ink)]'}`}
                >
                  <span className="text-[16px] font-bold leading-tight">{y}</span>
                  <span className={`text-[12px] leading-tight ${on ? 'text-white/80' : 'text-[var(--color-muted)]'}`}>{countByYear.get(y)} szám</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 3. a kiválasztott év, hónaponként */}
      <div className="rule-heading">
        <h2>{active}</h2>
        <span className="meta">
          {list.length} {weekly ? 'heti' : 'havi'} lapszám
        </span>
      </div>
      {fromLibrary && (
        <p className="meta -mt-2 mb-6">
          Digitalizálta:{' '}
          <a className="underline" href="http://www.koszeg-konyvtar.hu/node/77" target="_blank" rel="noopener noreferrer">
            Chernel Kálmán Városi Könyvtár, Kőszeg
          </a>
        </p>
      )}

      {weekly ? (
        <div className="flex flex-col gap-8">
          {[...byMonth.entries()].map(([m, items]) => (
            <section key={m} aria-labelledby={`honap-${m}`}>
              <h3 id={`honap-${m}`} className="section-label uppercase tracking-[0.08em] text-[12px] mb-3 capitalize">
                {monthName(m)}
              </h3>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
                {items.map((i) => (
                  <IssueCover key={i.id} issue={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((i) => (
            <IssueCover key={i.id} issue={i} />
          ))}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-[var(--color-line)]">
        <YearNav active={active} />
      </div>
    </div>
  );
};
