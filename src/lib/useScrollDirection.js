import { useEffect, useRef, useState } from 'react';

/**
 * Görgetéshez kötött fejléc-eltolás (px).
 * A képernyő első harmadáig a fejléc nem mozdul; utána lefelé görgetéskor a görgetéssel arányosan,
 * fokozatosan csúszik fel, felfelé görgetéskor ugyanígy fokozatosan jön vissza.
 */
export function useHeaderOffset(headerRef) {
  const [offset, setOffset] = useState(0);
  const state = useRef({ last: 0, offset: 0 });

  useEffect(() => {
    state.current.last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = Math.max(0, window.scrollY);
        const s = state.current;
        const delta = y - s.last;
        s.last = y;
        const height = headerRef.current?.offsetHeight || 60;
        const start = window.innerHeight / 3;
        let next = s.offset;
        if (y <= start) {
          // az első harmadban a fejléc a helyén marad (visszagörgetéskor fokozatosan tér vissza)
          next = delta < 0 ? Math.max(0, s.offset + delta) : Math.min(s.offset, Math.max(0, y - start));
          if (y < 4) next = 0;
        } else {
          next = Math.min(height + 8, Math.max(0, s.offset + delta * 0.6));
        }
        if (next !== s.offset) {
          s.offset = next;
          setOffset(next);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headerRef]);

  return offset;
}
