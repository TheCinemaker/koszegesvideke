import React from 'react';
import MANIFEST from '../data/searchManifest.json';
import { issues, articles, ARCHIVE_FIRST_YEAR } from '../lib/content';

// „Az archívum számokban” – minden adatépítéskor (scripts/build_site_data.py) magától frissül.
const fmt = (n) => Number(n || 0).toLocaleString('hu-HU');

// kerekítve, olvashatóan: 12 345 678 → „12,3 millió”
const big = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} millió` : fmt(n));

export function archiveStats() {
  const years = new Set(issues.map((i) => i.year));
  return [
    { value: fmt(issues.length), label: 'lapszám PDF-ben' },
    { value: fmt(MANIFEST.pages || issues.reduce((s, i) => s + (i.pages || 0), 0)), label: 'újságoldal' },
    { value: fmt(years.size), label: `évfolyam ${ARCHIVE_FIRST_YEAR}-től` },
    { value: fmt(articles.length), label: 'cikk (2026)' },
    { value: fmt(articles.reduce((s, a) => s + (a.images?.length || 0), 0)), label: 'fotó' },
    { key: 'words', value: big(MANIFEST.words), label: 'kereshető szó' },
    { value: fmt(MANIFEST.vocabulary), label: 'szavas szószedet' },
  ].filter((s) => s.value !== '0');
}

export const Stats = ({ compact = false }) => {
  const stats = archiveStats();
  // „Több mint 10 millió” – lefelé kerekítve, hogy igaz maradjon
  const words = MANIFEST.words || 0;
  const headline = words >= 1e6 ? `${Math.floor(words / 1e6)} millió` : null;
  const years = new Date().getFullYear() - ARCHIVE_FIRST_YEAR;
  if (compact) {
    return (
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-[var(--color-ink-2)]">
        {stats.slice(1, 3).concat(stats.slice(5, 6)).map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <dt className="order-last">{s.label}</dt>
            <dd className="font-serif font-bold text-[var(--color-ink)]">{s.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <section aria-labelledby="szamokban" className="border-b border-[var(--color-line)] pb-8 mb-8">
      <h2 id="szamokban" className="section-label uppercase tracking-[0.08em] text-[12px] mb-3">
        Az archívum számokban
      </h2>
      {headline && (
        <div className="mb-6">
          <p className="font-serif font-bold text-[30px] sm:text-[40px] leading-[1.1] text-[var(--color-ink)]">
            Több mint <span className="text-[var(--color-brand)]">{headline}</span> szó Kőszegről.
          </p>
          <p className="text-[17px] text-[var(--color-ink-2)] mt-2 leading-relaxed">
            {years} év helytörténete – és minden egyes szava kereshető.
          </p>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
        {stats.filter((s) => s.key !== 'words').map((s) => (
          <div key={s.label} className="flex flex-col-reverse justify-end border-l-2 border-[var(--color-gold)] pl-3">
            <dt className="meta mt-1.5 leading-snug">{s.label}</dt>
            <dd className="font-serif font-bold text-[24px] sm:text-[28px] lg:text-[24px] xl:text-[28px] leading-none whitespace-nowrap text-[var(--color-ink)]">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
