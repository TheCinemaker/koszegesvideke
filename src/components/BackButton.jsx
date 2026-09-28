import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { goBack } from '../lib/router';

// Lebegő „Vissza” gomb a „Tetejére” gomb fölött (a címlapon nincs).
// Ha a „Tetejére” gomb még nem látszik (300 px görgetés alatt), a helyére csúszik.
export const BackButton = () => {
  const [topVisible, setTopVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setTopVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={goBack}
      className={`fixed right-5 z-40 md:right-8 flex items-center gap-2 px-4 py-3 rounded-full bg-[var(--color-ink,#1a1a1a)] text-[#fcfbf7] shadow-xl hover:bg-[var(--color-brand)] border border-[var(--color-gold)] transition-all duration-300 hover:scale-105 active:scale-95 group ${
        topVisible ? 'bottom-[8.5rem] md:bottom-[5.75rem]' : 'bottom-20 md:bottom-8'
      }`}
      aria-label="Vissza az előző oldalra"
      title="Vissza"
    >
      <ChevronLeft className="w-5 h-5 text-[var(--color-gold)] group-hover:text-white transition-colors duration-200" aria-hidden="true" />
      <span className="text-[13px] font-medium tracking-wide uppercase hidden sm:inline">Vissza</span>
    </button>
  );
};
