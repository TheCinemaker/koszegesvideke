import React, { useEffect, useState } from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';

export const PdfModal = ({ pdfUrl, title, onClose }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!pdfUrl) return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

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
      window.removeEventListener('resize', checkMobile);
    };
  }, [pdfUrl, onClose]);

  if (!pdfUrl) return null;

  // Mobilon a Google Docs Viewer embed megjeleníti a teljes többoldalas PDF-et lapozhatóan
  const iframeSrc = isMobile
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`
    : `${pdfUrl}#toolbar=1&navpanes=0`;

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
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
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

      {/* PDF Viewport Container */}
      <div className="flex-1 w-full h-full bg-[#323639] relative flex flex-col">
        <iframe
          src={iframeSrc}
          title={title || 'PDF Megjelenítő'}
          className="w-full h-full border-0 flex-1"
          loading="lazy"
        />

        {/* Mobilon biztonsági alsó sáv ha az olvasó közvetlen PDF megnyitást szeretne */}
        {isMobile && (
          <div className="p-2 bg-[var(--color-ink,#1a1a1a)] border-t border-[var(--color-line)] text-center shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-[#d4af37] underline py-1"
            >
              <FileText className="w-4 h-4" /> Ha mobilon nem lapozható, kattints ide a közvetlen megnyitáshoz
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
