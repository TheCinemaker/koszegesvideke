import React from 'react';
import { ArticleCard } from '../components/ArticleCard';
import { href } from '../lib/router';
import { articles, sections, latestIssue, issueTitle } from '../lib/content';

// Címlap: legfelül a legfrissebb lapszám vezető cikkei, alatta rovatonként (a felső menü sorrendjében)
// a 2026-os cikkek, a legújabbal kezdve. Rovatonként legfeljebb PER_SECTION cikk, a többi a rovatoldalon.

const PER_SECTION = 16;

const byWeight = (list) => [...list].sort((a, b) => (b.weight || 0) - (a.weight || 0) || a.rank - b.rank);

// Képes cikkek váltakozó modulokba, a kép nélküliek a „Röviden” blokkba
function buildModules(list) {
  const withImg = list.filter((a) => a.images.length);
  const noImg = list.filter((a) => !a.images.length);
  const modules = [];
  const cycle = ['wide', 'three', 'four'];
  let i = 0;
  while (withImg.length) {
    const kind = cycle[i % cycle.length];
    if (kind === 'wide') {
      modules.push({ type: 'wide', main: withImg.shift(), side: noImg.splice(0, 3) });
    } else if (kind === 'three' && withImg.length >= 3) {
      modules.push({ type: 'three', items: withImg.splice(0, 3) });
    } else if (kind === 'four' && withImg.length >= 4) {
      modules.push({ type: 'four', items: withImg.splice(0, 4) });
    } else if (withImg.length >= 2) {
      modules.push({ type: 'three', items: withImg.splice(0, 3) });
    } else {
      modules.push({ type: 'wide', main: withImg.shift(), side: noImg.splice(0, 3) });
    }
    i++;
  }
  if (noImg.length) modules.push({ type: 'briefs', items: noImg });
  return modules;
}

const Module = ({ m, showSection }) => {
  switch (m.type) {
    case 'three':
      return (
        <div className={`grid gap-8 ${m.items.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} md:divide-x md:divide-[var(--color-line)]`}>
          {m.items.map((a, k) => (
            <div key={a.id} className={k ? 'md:pl-8' : ''}>
              <ArticleCard article={a} variant="feature" showSection={showSection} />
            </div>
          ))}
        </div>
      );
    case 'wide':
      return (
        <div className="grid gap-8 lg:grid-cols-12">
          <div className={m.side.length ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <ArticleCard article={m.main} variant="wide" showSection={showSection} />
          </div>
          {m.side.length > 0 && (
            <div className="lg:col-span-4 lg:border-l lg:border-[var(--color-line)] lg:pl-8">
              {m.side.map((a) => (
                <ArticleCard key={a.id} article={a} variant="text" showSection={showSection} />
              ))}
            </div>
          )}
        </div>
      );
    case 'four':
      return (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {m.items.map((a) => (
            <ArticleCard key={a.id} article={a} variant="small" showSection={showSection} />
          ))}
        </div>
      );
    case 'briefs':
      return (
        <div className="bg-[var(--color-brand-soft)] px-5 sm:px-8 py-5">
          <h4 className="font-sans text-[16px] font-extrabold text-[var(--color-brand)]">Röviden</h4>
          <div className="grid gap-x-10 md:grid-cols-2 lg:grid-cols-3">
            {m.items.map((a) => (
              <ArticleCard key={a.id} article={a} variant="text" showLead={false} showSection={showSection} />
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
};

export const HomePage = () => {
  // Nyitó: a legfrissebb lapszám legfontosabb képes cikkei
  const current = byWeight(articles.filter((a) => a.issueId === latestIssue.id));
  const leadPool = current.filter((a) => a.images.length);
  const hero = leadPool[0] || current[0];
  const side = (leadPool.length > 3 ? leadPool.slice(1, 4) : current.filter((a) => a !== hero).slice(0, 3));
  const headlines = current.filter((a) => a !== hero && !side.includes(a)).slice(0, 6);
  const used = new Set([hero, ...side].filter(Boolean).map((a) => a.id));

  const blocks = sections
    .map((s) => {
      const all = articles.filter((a) => a.section === s.slug && !used.has(a.id));
      return { section: s, total: all.length, modules: buildModules(all.slice(0, PER_SECTION)) };
    })
    .filter((b) => b.total > 0);

  return (
    <div className="container-news pt-4 sm:pt-8">
      {/* Rovatválasztó (mobilon/tableten): a tartalom része, görgetéssel eltűnik */}
      <nav aria-label="Rovatok" className="lg:hidden -mx-4 mb-4 overflow-x-auto no-scrollbar">
        <ul className="flex gap-2 px-4 w-max">
          {sections.map((s) => (
            <li key={s.slug}>
              <a
                href={href('rovat', s.slug)}
                className="block px-3.5 py-1.5 rounded-full border border-[var(--color-line)] bg-white text-[14px] font-semibold whitespace-nowrap active:bg-[var(--color-brand-soft)]"
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {hero && (
        <section aria-label="Vezető cikkek" className="pb-12">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6 lg:order-2">
              <ArticleCard article={hero} variant="hero" />
            </div>
            <div className="lg:col-span-3 lg:order-1 lg:border-r lg:border-[var(--color-line)] lg:pr-8 flex flex-col gap-6">
              {side.map((a, k) => (
                <div key={a.id} className={k ? 'pt-6 border-t border-[var(--color-line)]' : ''}>
                  <ArticleCard article={a} variant={k === 0 ? 'feature' : 'compact'} showLead={k === 0} />
                </div>
              ))}
            </div>
            <aside className="lg:col-span-3 lg:order-3 lg:border-l lg:border-[var(--color-line)] lg:pl-8">
              <h2 className="font-sans text-[15px] font-extrabold uppercase tracking-wide text-[var(--color-brand)] pb-2 border-b-2 border-[var(--color-ink)]">
                Friss · {issueTitle(latestIssue)}
              </h2>
              <ol className="mt-1">
                {headlines.map((a) => (
                  <li key={a.id}>
                    <ArticleCard article={a} variant="text" showLead={false} />
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>
      )}

      {blocks.map(({ section, total, modules }) => (
        <section key={section.slug} className="pt-4 pb-12" aria-labelledby={`rovat-${section.slug}`}>
          <div className="rule-heading">
            <h2 id={`rovat-${section.slug}`}>
              <a className="hover:text-[var(--color-brand)]" href={href('rovat', section.slug)}>{section.name}</a>
            </h2>
            <a className="meta hover:underline font-semibold" href={href('rovat', section.slug)}>
              Mind a {total} cikk →
            </a>
          </div>
          <div className="flex flex-col gap-10">
            {modules.map((m, k) => (
              <div key={k} className={k ? 'pt-10 border-t border-[var(--color-line)]' : ''}>
                <Module m={m} showSection={false} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
