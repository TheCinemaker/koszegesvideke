import React, { Suspense, lazy, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { issues } from '../lib/content';

// A PDF.js-olvasó csak PDF megnyitásakor töltődik le (külön csomag)
const PdfViewer = lazy(() => import('./PdfViewer'));

export const PdfModal = ({ pdfUrl, title, onClose }) => {
  useEffect(() => {
    if (!pdfUrl) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pdfUrl, onClose]);

  if (!pdfUrl) return null;

  // "…/kev_20260914_172.pdf#page=5" -> fájl + kezdőoldal; tartalékként az eredeti koszeg.hu-s cím
  const [fileUrl, hash = ''] = pdfUrl.split('#');
  const initialPage = Number((hash.match(/page=(\d+)/) || [])[1]) || 1;
  const filename = fileUrl.split('/').pop();
  const fallbackUrl = issues.find((i) => i.pdf && i.pdf.endsWith(`/${filename}`))?.pdfOriginal;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'PDF olvasó'}
    >
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--color-ink,#1a1a1a)] border-b border-[#d4af37]/40 text-white select-none shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="w-3 h-3 rounded-full bg-[#8b0000] border border-[#d4af37] shrink-0"></span>
          <h2 className="text-[15px] sm:text-[18px] font-serif font-bold text-[#fcfbf7] truncate max-w-[200px] sm:max-w-[500px]">
            {title || 'Kőszeg és Vidéke Lapszám'}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer external"
            data-no-modal="true"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Megnyitás teljes képernyőn / letöltés"
          >
            <ExternalLink className="w-4 h-4 text-[#d4af37]" />
            <span className="hidden sm:inline">Teljes képernyő</span>
          </a>

          <button
            onClick={onClose}
            className="flex items-center justify-center p-2 rounded-full bg-[#8b0000] hover:bg-red-700 text-white transition-colors duration-200 transform hover:scale-105 active:scale-95 shadow-md"
            aria-label="Bezárás"
            title="Bezárás (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* PDF Viewport Container – PDF.js: minden telefonon görgethető, a kért oldalon nyílik */}
      <div className="flex-1 min-h-0 w-full bg-[#323639] relative flex flex-col">
        <Suspense
          fallback={<div className="flex-1 flex items-center justify-center text-white/80 text-[16px]">Az olvasó betöltése…</div>}
        >
          <PdfViewer url={fileUrl} initialPage={initialPage} fallbackUrl={fallbackUrl} />
        </Suspense>
      </div>
    </div>
  );
};
