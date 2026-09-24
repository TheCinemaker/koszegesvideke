import React from 'react';
import { ArticleCard } from '../components/ArticleCard';
import { href } from '../lib/router';
import { articlesOfSection, getSection } from '../lib/content';

export const CategoryPage = ({ slug }) => {
  const section = getSection(slug);
  const list = articlesOfSection(slug);

  if (!section) {
    return (
      <div className="container-news py-20 text-center">
        <h1 className="text-[32px]">Nincs ilyen rovat</h1>
        <p className="mt-3 text-[18px]"><a className="text-[var(--color-brand)] underline" href={href('home')}>Vissza a címlapra</a></p>
      </div>
    );
  }

  const [first, ...rest] = list;

  return (
    <div className="container-news pt-8">
      <header className="border-b-2 border-[var(--color-ink)] pb-4 mb-8">
        <h1 className="text-[36px] sm:text-[44px] leading-tight">{section.name}</h1>
        <p className="meta mt-1">{list.length} cikk a 2026-os lapszámokból</p>
      </header>

      {!first && <p className="text-[18px]">Ebben a rovatban még nincs cikk.</p>}

      {first && (
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ArticleCard article={first} variant="hero" showSection={false} />
            <div className="mt-8 border-t border-[var(--color-line)]">
              {rest.map((a) => (
                <ArticleCard key={a.id} article={a} variant="row" showSection={false} />
              ))}
            </div>
          </div>
          <aside className="lg:col-span-4 lg:border-l lg:border-[var(--color-line)] lg:pl-8">
            <h2 className="font-sans text-[17px] font-bold mb-2">Keresne régebbi cikket?</h2>
            <p className="text-[16px] text-[var(--color-ink-2)] leading-relaxed">
              A 2012 óta megjelent lapszámok teljes szövegében kereshet, vagy böngészheti a lapszámokat.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <a className="btn" href={href('kereses')}>Keresés</a>
              <a className="btn" href={href('archivum')}>Archívum</a>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
