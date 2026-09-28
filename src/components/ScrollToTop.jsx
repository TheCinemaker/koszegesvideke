import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-20 right-5 z-40 md:bottom-8 md:right-8 flex items-center gap-2 px-4 py-3 rounded-full bg-[var(--color-ink,#1a1a1a)] text-[#fcfbf7] shadow-xl hover:bg-[var(--color-brand)] border border-[var(--color-gold)] transition-all duration-300 transform hover:scale-105 active:scale-95 group"
      aria-label="Vissza a tetejére"
      title="Vissza a tetejére"
    >
      <ChevronUp className="w-5 h-5 text-[var(--color-gold)] group-hover:text-white transition-colors duration-200" />
      <span className="text-[13px] font-medium tracking-wide uppercase hidden sm:inline">Tetejére</span>
    </button>
  );
};
