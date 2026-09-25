import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronUp, ChevronDown, Minus, Plus, Maximize2, ExternalLink } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// PDF.js alapú olvasó: minden telefonon görgethető, a kért oldalon nyílik, külső szolgáltatás nélkül.
// A PDF-et részletekben tölti (Range kérések), így egy 15 MB-os lapszámból csak a nézett oldalak jönnek le.
// Csak a képernyő közelében lévő oldalakat rendereli, a távoliakat felszabadítja (mobil memória).

const MAX_CANVAS_WIDTH = 2400;
const FIRST_CHUNK = 262144;

// Saját darabletöltő: a PDF.js csak a szükséges bájttartományokat kéri le (Range kérés).
// Nem függ attól, hogy a tárhely CORS-ban kiadja-e az Accept-Ranges fejlécet; elég a Content-Range.
async function openDocument(url) {
  try {
    const first = await fetch(url, { headers: { Range: `bytes=0-${FIRST_CHUNK - 1}` } });
    const total = Number((first.headers.get('Content-Range') || '').split('/')[1]);
    if (first.status === 206 && total > 0) {
      const initial = new Uint8Array(await first.arrayBuffer());
      const transport = new pdfjsLib.PDFDataRangeTransport(total, initial);
      transport.requestDataRange = (begin, end) => {
        fetch(url, { headers: { Range: `bytes=${begin}-${end - 1}` } })
          .then((r) => r.arrayBuffer())
          .then((buf) => transport.onDataRange(begin, new Uint8Array(buf)))
          .catch(() => {});
      };
      return pdfjsLib.getDocument({ range: transport, rangeChunkSize: FIRST_CHUNK, disableAutoFetch: true });
    }
  } catch {
    // tovább a teljes letöltésre
  }
  return pdfjsLib.getDocument({ url });
}

const Page = ({ doc, number, width, ratio, onVisible, registerRef }) => {
  const holder = useRef(null);
  const canvasRef = useRef(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = holder.current;
    registerRef(number, el);
    const ioNear = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '1200px 0px' });
    const ioVisible = new IntersectionObserver(([e]) => e.isIntersecting && onVisible(number), { threshold: 0.5 });
    ioNear.observe(el);
    ioVisible.observe(el);
    return () => {
      ioNear.disconnect();
      ioVisible.disconnect();
    };
  }, [number, onVisible, registerRef]);

  useEffect(() => {
    if (!near || !width) return undefined;
    let task = null;
    let cancelled = false;
    const canvasEl = canvasRef.current;
    doc.getPage(number).then((page) => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min((width * dpr) / base.width, MAX_CANVAS_WIDTH / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = canvasEl;
      if (!canvas) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
      task.promise.catch(() => {});
    });
    return () => {
      cancelled = true;
      task?.cancel();
      // távoli oldal: a vászon felszabadítása
      if (canvasEl) {
        canvasEl.width = 0;
        canvasEl.height = 0;
      }
    };
  }, [near, width, doc, number]);

  return (
    <div
      ref={holder}
      data-page={number}
      className="relative mx-auto bg-white shadow-lg"
      style={{ width, height: width * ratio }}
    >
      {near ? (
        <canvas ref={canvasRef} className="block w-full h-full" aria-label={`${number}. oldal`} />
      ) : null}
      <span className="absolute bottom-1 right-2 text-[11px] text-neutral-400 select-none">{number}</span>
    </div>
  );
};

export default function PdfViewer({ url, initialPage = 1, fallbackUrl }) {
  const scroller = useRef(null);
  const pageEls = useRef(new Map());
  const [doc, setDoc] = useState(null);
  const [ratio, setRatio] = useState(1.414);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);
  const [current, setCurrent] = useState(initialPage);
  const jumped = useRef(false);

  useEffect(() => {
    let alive = true;
    let task = null;
    openDocument(url)
      .then((t) => {
        task = t;
        if (!alive) {
          t.destroy();
          return null;
        }
        return t.promise;
      })
      .then(async (d) => {
        if (!d) return;
        const p1 = await d.getPage(1);
        const vp = p1.getViewport({ scale: 1 });
        if (!alive) return;
        setRatio(vp.height / vp.width);
        setDoc(d);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
      task?.destroy();
    };
  }, [url]);

  // oldalszélesség: a képernyőhöz igazítva (max. 900 px), a nagyítás ehhez képest
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const measure = () => setFitWidth(Math.min(el.clientWidth - 16, 900));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = Math.round(fitWidth * zoom);
  const registerRef = useCallback((n, el) => pageEls.current.set(n, el), []);
  const goTo = useCallback((n, smooth = true) => {
    const el = pageEls.current.get(n);
    if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
  }, []);

  // megnyitás a kért oldalon
  useEffect(() => {
    if (!doc || !width || jumped.current) return;
    if (initialPage > 1) requestAnimationFrame(() => goTo(Math.min(initialPage, doc.numPages), false));
    jumped.current = true;
  }, [doc, width, initialPage, goTo]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-sm">
          <p className="text-[17px] font-semibold">Ezt a lapszámot most nem sikerült betölteni.</p>
          <p className="text-[15px] text-white/70 mt-2">Lehet, hogy még nincs feltöltve az archívumba.</p>
          {fallbackUrl && (
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer external"
              data-no-modal="true"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-lg bg-white text-[var(--color-brand)] font-bold"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" /> Megnyitás az eredeti forrásnál
            </a>
          )}
        </div>
      </div>
    );
  }

  const n = doc?.numPages || 0;
  const btn = 'w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-40';

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div ref={scroller} className="flex-1 min-h-0 overflow-auto overscroll-contain py-3" style={{ WebkitOverflowScrolling: 'touch' }}>
        {!doc && (
          <div className="h-full flex items-center justify-center text-white/80 text-[16px]">
            <span className="w-6 h-6 mr-3 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
            A lapszám betöltése…
          </div>
        )}
        {doc && width > 0 && (
          <div className="flex flex-col items-center gap-3" style={{ minWidth: width + 16 }}>
            {Array.from({ length: n }, (_, i) => (
              <Page key={i + 1} doc={doc} number={i + 1} width={width} ratio={ratio} onVisible={setCurrent} registerRef={registerRef} />
            ))}
          </div>
        )}
      </div>

      {doc && (
        <div
          className="shrink-0 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-ink,#1a1a1a)] text-white border-t border-white/10"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
        >
          <button type="button" className={btn} onClick={() => goTo(current - 1)} disabled={current <= 1} aria-label="Előző oldal">
            <ChevronUp className="w-5 h-5" aria-hidden="true" />
          </button>
          <label className="flex items-center gap-1.5 text-[15px] tabular-nums">
            <span className="sr-only">Oldal</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={n}
              value={current}
              onChange={(e) => {
                const v = Math.max(1, Math.min(n, Number(e.target.value) || 1));
                setCurrent(v);
                goTo(v);
              }}
              className="w-12 text-center rounded-md bg-white/10 py-1.5"
            />
            <span className="text-white/70">/ {n}</span>
          </label>
          <button type="button" className={btn} onClick={() => goTo(current + 1)} disabled={current >= n} aria-label="Következő oldal">
            <ChevronDown className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="w-px h-6 bg-white/20 mx-1" aria-hidden="true" />
          <button type="button" className={btn} onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))} aria-label="Kicsinyítés">
            <Minus className="w-5 h-5" aria-hidden="true" />
          </button>
          <button type="button" className={btn} onClick={() => setZoom(1)} aria-label="Szélességhez igazítás">
            <Maximize2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" className={btn} onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Nagyítás">
            <Plus className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
