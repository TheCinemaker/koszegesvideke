import React, { useEffect, useRef, useState } from 'react';
import { Home, LayoutGrid, Search, Megaphone, Library, X, ChevronRight, ArrowRight } from 'lucide-react';
import { href, navigate } from '../lib/router';
import { sections, articles, latestIssue, issueTitle, ARCHIVE_FIRST_YEAR } from '../lib/content';

// Alulról felcsúszó panel
const Sheet = ({ open, onClose, title, children, labelledBy }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div
      className={`lg:hidden fixed inset-0 z-50 transition-[visibility] duration-300 ${open ? 'visible' : 'invisible pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-white rounded-t-[22px] shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <div className="sticky top-0 bg-white pt-2.5 pb-3 px-5 border-b border-[var(--color-line)]">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-[#d4d4d4] mb-3" />
          <div className="flex items-center justify-between">
            <h2 id={labelledBy} className="font-sans text-[20px] font-extrabold">{title}</h2>
            <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-[#f2f2f2]" aria-label="Bezárás">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

const counts = Object.fromEntries(sections.map((s) => [s.slug, articles.filter((a) => a.section === s.slug).length]));

export const MobileNav = ({ route }) => {
  const [sheet, setSheet] = useState(null); // 'rovatok' | 'kereses' | null
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const close = () => setSheet(null);

  useEffect(() => {
    if (sheet === 'kereses') setTimeout(() => inputRef.current?.focus(), 250);
  }, [sheet]);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    close();
    navigate('kereses', null, { q: q.trim() });
  };

  const is = (name) => route.name === name;
  const item = 'flex flex-col items-center justify-center gap-1 flex-1 h-full text-[11px] font-semibold';
  const color = (active) => (active ? 'text-[var(--color-brand)]' : 'text-[#5b5b5b]');

  return (
    <>
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/85 backdrop-blur-xl border-t border-black/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Fő navigáció"
      >
        <div className="relative flex items-stretch h-[62px] max-w-[560px] mx-auto">
          <a href={href('home')} className={`${item} ${color(is('home'))}`} aria-current={is('home') ? 'page' : undefined}>
            <Home className="w-[23px] h-[23px]" strokeWidth={is('home') ? 2.4 : 1.9} aria-hidden="true" />
            Címlap
          </a>
          <button type="button" onClick={() => setSheet('rovatok')} className={`${item} ${color(is('rovat'))}`}>
            <LayoutGrid className="w-[23px] h-[23px]" strokeWidth={is('rovat') ? 2.4 : 1.9} aria-hidden="true" />
            Rovatok
          </button>

          <div className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => setSheet('kereses')}
              className="-mt-6 w-[62px] h-[62px] rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(21,78,135,0.45)] ring-4 ring-white active:scale-95 transition-transform"
              aria-label="Keresés"
            >
              <Search className="w-7 h-7" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>

          <a href={href('archivum')} className={`${item} ${color(is('archivum'))}`} aria-current={is('archivum') ? 'page' : undefined}>
            <Library className="w-[23px] h-[23px]" strokeWidth={is('archivum') ? 2.4 : 1.9} aria-hidden="true" />
            Archívum
          </a>
          <a href={href('hirdetesek')} className={`${item} ${color(is('hirdetesek'))}`} aria-current={is('hirdetesek') ? 'page' : undefined}>
            <Megaphone className="w-[23px] h-[23px]" strokeWidth={is('hirdetesek') ? 2.4 : 1.9} aria-hidden="true" />
            Hirdetések
          </a>
        </div>
      </nav>

      <Sheet open={sheet === 'rovatok'} onClose={close} title="Rovatok" labelledBy="sheet-rovatok">
        <ul className="px-3 py-2">
          {sections.map((s) => (
            <li key={s.slug}>
              <a
                href={href('rovat', s.slug)}
                onClick={close}
                className={`flex items-center justify-between px-3 py-3.5 rounded-xl text-[18px] font-semibold ${
                  route.name === 'rovat' && route.param === s.slug ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' : 'active:bg-[#f2f2f2]'
                }`}
              >
                <span>{s.name}</span>
                <span className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-muted)]">
                  {counts[s.slug]} cikk <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mx-5 mt-1 grid grid-cols-2 gap-3">
          <a href={href('lapszam', latestIssue.id)} onClick={close} className="rounded-2xl bg-[var(--color-brand-soft)] p-4 active:opacity-80">
            <span className="block text-[13px] font-semibold text-[var(--color-muted)]">Legfrissebb szám</span>
            <span className="block text-[17px] font-bold text-[var(--color-brand)] mt-0.5">{issueTitle(latestIssue)}</span>
          </a>
          <a href={href('archivum')} onClick={close} className="rounded-2xl bg-[#f3f3f1] p-4 active:opacity-80">
            <span className="block text-[13px] font-semibold text-[var(--color-muted)]">Archívum</span>
            <span className="block text-[17px] font-bold mt-0.5">Lapszámok {ARCHIVE_FIRST_YEAR}-től</span>
          </a>
        </div>
      </Sheet>

      <Sheet open={sheet === 'kereses'} onClose={close} title="Keresés" labelledBy="sheet-kereses">
        <form onSubmit={submit} className="px-5 pt-4" role="search">
          <label htmlFor="mobil-kereso" className="sr-only">Keresett kifejezés</label>
          <div className="flex items-center gap-2 bg-[#f1f1f1] rounded-2xl pl-4 pr-1.5 py-1.5">
            <Search className="w-5 h-5 text-[var(--color-muted)] shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              id="mobil-kereso"
              type="search"
              enterKeyHint="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mit keres?"
              className="flex-1 min-w-0 bg-transparent py-2 text-[18px] focus:outline-none"
            />
            <button type="submit" className="w-11 h-11 rounded-xl bg-[var(--color-brand)] text-white flex items-center justify-center" aria-label="Keresés indítása">
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-[15px] text-[var(--color-ink-2)] mt-3 leading-relaxed">
            A 2026-os cikkekben és a digitalizált lapszámok ({ARCHIVE_FIRST_YEAR}-től) szövegében keres. Ékezet nélkül is működik.
          </p>
          <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-muted)] mt-5 mb-2">Népszerű keresések</p>
          <div className="flex flex-wrap gap-2 pb-2">
            {['Ostromnapok', 'Jurisics', 'azbeszt', 'szüret', 'vasútállomás', 'Lóránt FC'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  close();
                  navigate('kereses', null, { q: t });
                }}
                className="px-3.5 py-2 rounded-full border border-[var(--color-line)] text-[15px] font-medium active:bg-[#f2f2f2]"
              >
                {t}
              </button>
            ))}
          </div>
        </form>
      </Sheet>
    </>
  );
};
