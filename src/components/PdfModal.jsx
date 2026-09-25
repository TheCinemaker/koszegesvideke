import React, { useEffect } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

export const PdfModal = ({ pdfUrl, title, onClose }) => {
  useEffect(() => {
    if (!pdfUrl) return;

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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'PDF olvasó'}
    >
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--color-ink,#1a1a1a)] border-b border-[#d4af37]/40 text-white select-none">
        <div className="flex items-center gap-3 truncate">
          <span className="w-3 h-3 rounded-full bg-[#8b0000] border border-[#d4af37]"></span>
          <h2 className="text-[16px] sm:text-[18px] font-serif font-bold text-[#fcfbf7] truncate max-w-[300px] sm:max-w-[500px]">
            {title || 'Kőszeg és Vidéke Lapszám'}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Megnyitás külön ablakban"
          >
            <ExternalLink className="w-4 h-4 text-[#d4af37]" />
            <span className="hidden sm:inline">Új ablakban</span>
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
      <div className="flex-1 w-full h-full bg-[#323639] relative">
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=0`}
          title={title || 'PDF Megjelenítő'}
          className="w-full h-full border-0"
          loading="lazy"
        />
      </div>
    </div>
  );
};
