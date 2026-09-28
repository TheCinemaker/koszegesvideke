import React, { useEffect, useState } from 'react';
import { BookOpen, Newspaper, ChevronRight } from 'lucide-react';
import { href } from '../lib/router';
import { issues, issueTitle, pdfLink } from '../lib/content';

const DAY = 86400000;

// „Így írtunk”: a mai naphoz illő régi lapszámok.
// Heti lapszám (1889–1939): ami ezen a héten jelent meg (±3 nap); havi lapszám: ami ebben a hónapban.
export function issuesOfThisWeek(today = new Date()) {
  const y = today.getFullYear();
  const t = Date.UTC(y, today.getMonth(), today.getDate());
  const byYear = new Map();
  for (const i of issues) {
    if (i.year >= y) continue;
    let diff;
    if (i.weekly) {
      diff = Math.abs(t - Date.UTC(y, i.month - 1, i.day)) / DAY;
      if (diff > 3) continue;
    } else {
      if (i.month !== today.getMonth() + 1) continue;
      diff = 0;
    }
    const prev = byYear.get(i.year);
    if (!prev || diff < prev.diff) byYear.set(i.year, { issue: i, ago: y - i.year, diff });
  }
  return [...byYear.values()].sort((a, b) => a.ago - b.ago);
}

// 1, 10 és 100 éve – ha a pontos évforduló nincs meg (vagy még nincs feltöltve), a legközelebbi év
const TARGETS = [
  { ago: 1, maxOff: 1 },
  { ago: 10, maxOff: 3 },
  { ago: 100, maxOff: 40 },
];

export function anniversaryIssues(today = new Date()) {
  const all = issuesOfThisWeek(today);
  const used = new Set();
  const out = [];
  for (const { ago, maxOff } of TARGETS) {
    let best = null;
    for (const c of all) {
      const off = Math.abs(c.ago - ago);
      if (off > maxOff || used.has(c.issue.id)) continue;
      if (!best || off < Math.abs(best.ago - ago) || (off === Math.abs(best.ago - ago) && c.ago > best.ago)) best = c;
    }
    if (best) {
      used.add(best.issue.id);
      out.push(best);
    }
  }
  return out;
}

// "1, 10 és 100"
const agoList = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} és ${a[a.length - 1]}` : String(a[0]));

// A mai dátum a látogatóé: csak a böngészőben számoljuk (az előrenderelt oldal a build napján készül)
function useToday(fn) {
  const [v, setV] = useState(null);
  useEffect(() => setV(fn(new Date())), []); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

// Vékony sáv a címlap tetején → /igy-irtunk
// Újságos „fülcsík”: vékony vonalak között rovatcímke + talpas szöveg + a régi címlapok apró kötege
export const ThisWeekStrip = () => {
  const items = useToday(anniversaryIssues);
  const text = items?.length ? `${agoList(items.map((x) => x.ago))} éve ezen a héten` : 'régi lapszámok ezen a héten';
  return (
    <a
      href={href('igy-irtunk')}
      className="group flex items-center gap-3 border-t-2 border-t-[var(--color-gold)] border-b border-b-[var(--color-line)] py-2 mb-4 transition-colors hover:border-b-[var(--color-ink)]"
    >
      <span className="min-w-0 flex-1">
        <span className="section-label uppercase tracking-[0.08em] text-[12px] block leading-none">Így írtunk</span>
        <span className="font-serif text-[17px] leading-snug text-[var(--color-ink)] block truncate mt-1 group-hover:text-[var(--color-brand)]">
          {text}
        </span>
      </span>
      {items?.length > 0 && (
        <span className="flex shrink-0 pr-1" aria-hidden="true">
          {items.map(({ issue }, k) => (
            <span
              key={issue.id}
              className="block w-[26px] h-[36px] overflow-hidden border border-[var(--color-line)] bg-white shadow-sm"
              style={{ marginLeft: k ? -10 : 0, transform: `rotate(${(k - 1) * 4}deg)`, zIndex: k }}
            >
              {issue.cover && <img src={issue.cover} alt="" loading="lazy" className="w-full h-full object-cover object-top" />}
            </span>
          ))}
        </span>
      )}
      <ChevronRight className="w-5 h-5 shrink-0 text-[var(--color-muted)] group-hover:text-[var(--color-ink)]" aria-hidden="true" />
    </a>
  );
};

const Cover = ({ issue, className = '' }) => (
  <a href={pdfLink(issue)} target="_blank" rel="noopener noreferrer" className={`headline-link block ${className}`}>
    <div className="img-frame border border-[#d9cfba] shadow-sm bg-white" style={{ aspectRatio: '1241 / 1737' }}>
      {issue.cover && (
        <img key={issue.id} src={issue.cover} alt={`A ${issueTitle(issue)} lapszám címlapja`} loading="lazy" style={{ objectFit: 'cover', objectPosition: 'top' }} />
      )}
    </div>
  </a>
);

// Az „Így írtunk” oldal: 3 fül (1, 10, 100 éve) + az összes, ezen a héten megjelent régi lapszám
export const ThisWeekPage = () => {
  const items = useToday(anniversaryIssues);
  const all = useToday(issuesOfThisWeek);
  const [active, setActive] = useState(null);

  if (!items) return <div className="container-news pt-8 min-h-[60vh]" />;
  const cur = items.length ? items[Math.min(active ?? items.length - 1, items.length - 1)] : null;
  const activeIdx = cur ? items.indexOf(cur) : -1;

  return (
    <div className="container-news pt-8">
      <header className="border-b-2 border-[var(--color-ink)] pb-4 mb-6">
        <h1 className="text-[36px] sm:text-[44px] leading-tight">Így írtunk</h1>
        <p className="text-[17px] text-[var(--color-ink-2)] mt-2 max-w-[70ch] leading-relaxed">
          Mit írt a Kőszeg és Vidéke ugyanezen a héten {items.length ? agoList(items.map((x) => x.ago)) : 'sok'} évvel ezelőtt? Lapozza át az eredeti lapszámokat!
        </p>
      </header>

      {cur && (
        <section aria-label="1, 10 és 100 éve" className="rounded-xl bg-[#f4efe4] border border-[#e4dccb] p-4 sm:p-6">
          <div role="tablist" aria-label="Mikori lapszám" className="inline-flex rounded-full bg-white/70 border border-[#e4dccb] p-1 mb-5">
            {items.map((it, k) => (
              <button
                key={it.issue.id}
                type="button"
                role="tab"
                id={`evf-tab-${k}`}
                aria-selected={k === activeIdx}
                aria-controls="evf-panel"
                onClick={() => setActive(k)}
                className={`px-4 py-1.5 rounded-full text-[15px] font-bold transition-colors ${k === activeIdx ? 'bg-[var(--color-brand)] text-white shadow-sm' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'}`}
              >
                {it.ago} éve
              </button>
            ))}
          </div>

          <div id="evf-panel" role="tabpanel" aria-labelledby={`evf-tab-${activeIdx}`} className="flex gap-4 sm:gap-8 items-start">
            <Cover issue={cur.issue} className="w-[42%] max-w-[300px] shrink-0" />
            <div className="min-w-0 pt-1">
              <p className="font-sans text-[13px] font-bold uppercase tracking-wide text-[var(--color-brand)]">{cur.ago} évvel ezelőtt</p>
              <p className="headline text-[20px] sm:text-[28px] mt-1 leading-snug">{issueTitle(cur.issue)}</p>
              <p className="meta mt-1">
                {cur.issue.pages} oldal{cur.issue.source ? ` · digitalizálta: ${cur.issue.source}` : ''}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                <a
                  href={pdfLink(cur.issue)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" /> Lapozza át
                </a>
                {cur.issue.articleCount > 0 && (
                  <a href={href('lapszam', cur.issue.id)} className="btn inline-flex items-center gap-1.5">
                    <Newspaper className="w-4 h-4" aria-hidden="true" /> A lapszám cikkei
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {all && all.length > items.length && (
        <section aria-labelledby="minden-ev" className="pt-10">
          <div className="rule-heading">
            <h2 id="minden-ev">Ezen a héten a régi lapokban</h2>
            <span className="meta">{all.length} lapszám</span>
          </div>
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
            {[...all].reverse().map(({ issue, ago }) => (
              <li key={issue.id}>
                <Cover issue={issue} />
                <p className="headline text-[16px] mt-2">{issueTitle(issue)}</p>
                <p className="meta">{ago} éve</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!items.length && <p className="text-[18px] text-[var(--color-ink-2)]">Erre a hétre most nincs régi lapszám az archívumban.</p>}
    </div>
  );
};
