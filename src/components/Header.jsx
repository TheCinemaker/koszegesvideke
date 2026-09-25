import React, { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { href, navigate } from '../lib/router';
import { sections, latestIssue, issueTitle } from '../lib/content';
import { useHeaderOffset } from '../lib/useScrollDirection';

const todayText = () => {
  const s = new Date().toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const Header = ({ route }) => {
  const mobileRef = useRef(null);
  const offset = useHeaderOffset(mobileRef);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState(route.name === 'kereses' ? route.query.q || '' : '');

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      setSearchOpen(false);
      navigate('kereses', null, { q: q.trim() });
    }
  };

  const isActive = (name, param) => route.name === name && (param == null || route.param === param);
  const navItems = [
    { label: 'Címlap', to: href('home'), active: route.name === 'home' },
    ...sections.map((s) => ({ label: s.name, to: href('rovat', s.slug), active: isActive('rovat', s.slug) })),
    { label: 'Archívum', to: href('archivum'), active: isActive('archivum') },
  ];

  return (
    <>
      {/* ---------- Mobil / tablet: kék, üveghatású lapfej + rovatchipek; görgetéskor fokozatosan felcsúszik ---------- */}
      <header
        ref={mobileRef}
        className="lg:hidden sticky top-0 z-40 text-white bg-[#154e87]/90 backdrop-blur-xl backdrop-saturate-150 shadow-[0_6px_16px_-6px_rgba(10,30,60,0.55)] transition-transform duration-200 ease-out will-change-transform"
        style={{ transform: `translateY(${-offset}px)` }}
      >
        <div className="px-4 pt-1.5">
          <p className="text-[10.5px] leading-none text-white/70 text-center">{todayText()}</p>
          <div className="flex items-center justify-between gap-3 pt-1.5 pb-2">
            <a href={href('home')} className="flex items-center gap-2 min-w-0" aria-label="Kőszeg és Vidéke – címlap">
              <img src="/crest-white.png" alt="" className="h-7 w-auto shrink-0" width="360" height="271" />
              <span className="font-serif font-bold text-[21px] leading-none tracking-[-0.01em] truncate">Kőszeg és Vidéke</span>
            </a>
            <a
              href={href('lapszam', latestIssue.id)}
              className="shrink-0 text-[11.5px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/25"
            >
              {issueTitle(latestIssue).split(',')[0].replace(/^\d+\. /, '')}
            </a>
          </div>
        </div>
        <div className="h-[3px] bg-[#cfb284]" aria-hidden="true" />
      </header>

      {/* ---------- Asztali: klasszikus újságfej ---------- */}
      <header className="hidden lg:block bg-white">
        <div className="container-news">
          <div className="flex items-center justify-between gap-4 py-2.5 meta text-[14px] border-b border-[var(--color-line)]">
            <span>{todayText()}</span>
            <a className="hover:underline" href={href('lapszam', latestIssue.id)}>
              Legfrissebb szám: <strong className="text-[var(--color-brand)]">{issueTitle(latestIssue)}</strong>
            </a>
          </div>
          <a href={href('home')} className="flex items-center justify-center gap-5 py-7" aria-label="Kőszeg és Vidéke – címlap">
            <img src="/crest.png" alt="" className="h-20 w-auto shrink-0" width="360" height="271" />
            <span className="flex flex-col items-center">
              <span className="font-serif font-bold text-[64px] leading-[1] tracking-[-0.015em] text-[var(--color-brand)]">Kőszeg és Vidéke</span>
              <span className="mt-2 text-[16px] text-[var(--color-ink-2)] font-medium">
                Kőszeg város és környéke polgárainak ingyenes havilapja
              </span>
            </span>
          </a>
          <div className="flex justify-between items-center border-t-[3px] border-double border-[var(--color-ink)] py-1.5 meta text-[13px]">
            <span>Alapítva 1881-ben</span>
            <span>
              {latestIssue.volume ? `${latestIssue.volume}. évfolyam, ${latestIssue.number}. szám · ` : ''}
              {issueTitle(latestIssue).split(',')[0]}
            </span>
          </div>
        </div>
      </header>

      <nav className="hidden lg:block sticky top-0 z-30 bg-[var(--color-brand)] text-white shadow-sm" aria-label="Rovatok">
        <div className="container-news flex items-center gap-2">
          <ul className="flex items-stretch flex-1 -ml-3 overflow-x-auto">
            {navItems.map((it) => (
              <li key={it.label} className="shrink-0">
                <a
                  href={it.to}
                  aria-current={it.active ? 'page' : undefined}
                  className={`block px-3 xl:px-3.5 py-3.5 text-[15px] xl:text-[15.5px] font-semibold border-b-[3px] ${
                    it.active ? 'border-white bg-[var(--color-brand-dark)]' : 'border-transparent hover:bg-[var(--color-brand-dark)]'
                  }`}
                >
                  {it.label}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[var(--color-brand-dark)] text-[15px] font-semibold"
            aria-expanded={searchOpen}
          >
            <Search className="w-5 h-5" aria-hidden="true" /> Keresés
          </button>
        </div>
        {searchOpen && (
          <div className="bg-[var(--color-brand-dark)]">
            <form onSubmit={submit} className="container-news flex gap-2 py-3" role="search">
              <label htmlFor="site-search" className="sr-only">Keresés az újságban</label>
              <input
                id="site-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Keresés a cikkekben és a digitalizált lapszámokban…"
                className="flex-1 min-w-0 px-4 py-2.5 text-[17px] text-[var(--color-ink)] bg-white rounded-md focus:outline-none"
                autoFocus
              />
              <button type="submit" className="px-5 py-2.5 rounded-md bg-white text-[var(--color-brand)] font-bold text-[16px]">
                Keresés
              </button>
            </form>
          </div>
        )}
      </nav>
    </>
  );
};
