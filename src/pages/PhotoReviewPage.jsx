import React, { useEffect, useMemo, useState } from 'react';
import { Check, X, Download, MessageSquare } from 'lucide-react';
import { href } from '../lib/router';
import { articles, issues, issueTitle } from '../lib/content';

// Szerkesztői fotóellenőrzés: minden cikk minden képe, egy koppintással „rossz kép” jelölés.
// A jelölések a böngészőben maradnak; a letöltött fájlból a curation.json javítható.
const KEY = 'kev_photo_review_v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export const PhotoReviewPage = () => {
  const withImages = issues.filter((i) => i.articleCount > 0);
  const [issueId, setIssueId] = useState(withImages[0]?.id);
  const [state, setState] = useState(() => ({ bad: {}, notes: {}, done: {}, ...load() }));
  const [openNote, setOpenNote] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // a böngésző nem enged tárolni – a jelölések ekkor csak az oldal bezárásáig maradnak meg
    }
  }, [state]);

  const list = useMemo(
    () => articles.filter((a) => a.issueId === issueId).sort((a, b) => a.page - b.page || a.rank - b.rank),
    [issueId]
  );

  const toggleBad = (src) => setState((s) => ({ ...s, bad: { ...s.bad, [src]: !s.bad[src] } }));
  const setNote = (id, text) => setState((s) => ({ ...s, notes: { ...s.notes, [id]: text } }));
  const toggleDone = (id) => setState((s) => ({ ...s, done: { ...s.done, [id]: !s.done[id] } }));

  const badCount = Object.values(state.bad).filter(Boolean).length;
  const noteCount = Object.values(state.notes).filter((t) => t && t.trim()).length;
  const doneIn = (id) => articles.filter((a) => a.issueId === id).filter((a) => state.done[a.id]).length;

  const exportFile = () => {
    const out = {
      keszult: new Date().toISOString(),
      rossz_kepek: Object.keys(state.bad).filter((k) => state.bad[k]),
      megjegyzesek: Object.fromEntries(Object.entries(state.notes).filter(([, t]) => t && t.trim())),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kepellenorzes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="container-news pt-6 pb-10">
      <h1 className="text-[28px] sm:text-[36px] leading-tight">Fotóellenőrzés</h1>
      <p className="text-[16px] text-[var(--color-ink-2)] mt-2 max-w-[70ch]">
        Koppints arra a képre, amelyik nem a cikkhez tartozik (hirdetés, rossz fotó, rossz vágás) – piros keretet kap. Megjegyzést is
        írhatsz a cikkhez. A cikk alján a „Kész” gombbal jelölheted, hogy átnézted. A végén töltsd le a jelöléseket, és küldd el.
      </p>

      <div className="sticky top-0 lg:top-[52px] z-20 bg-white/95 backdrop-blur py-3 mt-4 border-b border-[var(--color-line)] flex flex-wrap items-center gap-2">
        <select
          value={issueId}
          onChange={(e) => setIssueId(e.target.value)}
          className="px-3 py-2 border border-[var(--color-line)] rounded-lg text-[16px] font-semibold bg-white"
        >
          {withImages.map((i) => (
            <option key={i.id} value={i.id}>
              {issueTitle(i)} ({doneIn(i.id)}/{i.articleCount} kész)
            </option>
          ))}
        </select>
        <span className="meta">
          {badCount} rossz kép · {noteCount} megjegyzés
        </span>
        <button type="button" onClick={exportFile} className="btn btn-primary ml-auto text-[15px] py-2">
          <Download className="w-4 h-4" aria-hidden="true" /> Jelölések letöltése
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {list.map((a) => (
          <section
            key={a.id}
            className={`rounded-2xl border p-4 ${state.done[a.id] ? 'border-green-300 bg-green-50/40' : 'border-[var(--color-line)]'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="meta">
                  {a.page}. oldal · {a.images.length} kép
                </p>
                <a href={href('cikk', a.id)} target="_blank" rel="noopener noreferrer" className="headline text-[18px] underline-offset-2 hover:underline">
                  {a.title}
                </a>
              </div>
              <button
                type="button"
                onClick={() => setOpenNote(openNote === a.id ? null : a.id)}
                className={`shrink-0 p-2 rounded-lg border ${state.notes[a.id] ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-[var(--color-line)]'}`}
                aria-label="Megjegyzés"
              >
                <MessageSquare className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {a.images.length === 0 && <p className="meta mt-2">Nincs kép. Ha kellene, írd meg megjegyzésben.</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
              {a.images.map((im) => {
                const bad = !!state.bad[im.src];
                return (
                  <button
                    key={im.src}
                    type="button"
                    onClick={() => toggleBad(im.src)}
                    className={`relative rounded-xl overflow-hidden border-4 bg-[#f2f2f2] ${bad ? 'border-red-600' : 'border-transparent'}`}
                    aria-pressed={bad}
                    title={im.src}
                  >
                    <img src={im.src} alt="" loading="lazy" className="w-full h-36 object-contain" />
                    {bad && (
                      <span className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center">
                        <X className="w-4 h-4" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {openNote === a.id && (
              <textarea
                autoFocus
                rows={3}
                value={state.notes[a.id] || ''}
                onChange={(e) => setNote(a.id, e.target.value)}
                placeholder="Pl. hiányzik egy fotó, rossz a cím, sortörési hiba az 5. bekezdésben…"
                className="w-full mt-3 px-3 py-2 text-[16px] border border-[var(--color-line)] rounded-lg"
              />
            )}
            {state.notes[a.id] && openNote !== a.id && (
              <p className="mt-2 text-[15px] text-[var(--color-brand)]">Megjegyzés: {state.notes[a.id]}</p>
            )}

            <button
              type="button"
              onClick={() => toggleDone(a.id)}
              className={`mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold px-3 py-1.5 rounded-full border ${
                state.done[a.id] ? 'bg-green-600 border-green-600 text-white' : 'border-[var(--color-line)]'
              }`}
            >
              <Check className="w-4 h-4" aria-hidden="true" /> {state.done[a.id] ? 'Kész' : 'Kész, átnéztem'}
            </button>
          </section>
        ))}
      </div>
    </div>
  );
};
