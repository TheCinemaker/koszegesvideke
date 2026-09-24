import React from 'react';
import { IssueCover } from '../components/IssueCover';
import { href } from '../lib/router';
import { issues } from '../lib/content';

export const ArchivePage = ({ year }) => {
  const years = [...new Set(issues.map((i) => i.year))].sort((a, b) => b - a);
  const active = Number(year) || years[0];
  const list = issues.filter((i) => i.year === active).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="container-news pt-8">
      <header className="border-b-2 border-[var(--color-ink)] pb-4 mb-6">
        <h1 className="text-[36px] sm:text-[44px] leading-tight">Archívum</h1>
        <p className="text-[17px] text-[var(--color-ink-2)] mt-2 max-w-[70ch] leading-relaxed">
          A Kőszeg és Vidéke {years[years.length - 1]} és {years[0]} között megjelent {issues.length} lapszáma. A régebbi számok eredeti
          PDF-ben nyílnak meg; a teljes szövegükben a <a className="text-[var(--color-brand)] underline" href={href('kereses')}>keresővel</a> kereshet.
        </p>
      </header>

      <nav aria-label="Évek" className="flex flex-wrap gap-2 mb-8">
        {years.map((y) => (
          <a
            key={y}
            href={href('archivum', y)}
            aria-current={y === active ? 'page' : undefined}
            className={`px-3.5 py-2 rounded-md text-[16px] font-semibold border ${y === active ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white' : 'border-[var(--color-line)] hover:border-[var(--color-ink)]'}`}
          >
            {y}
          </a>
        ))}
      </nav>

      <h2 className="font-sans text-[20px] font-bold mb-5">{active}. évi lapszámok ({list.length})</h2>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {list.map((i) => (
          <IssueCover key={i.id} issue={i} />
        ))}
      </div>
    </div>
  );
};
