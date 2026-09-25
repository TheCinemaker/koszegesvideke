import React from 'react';
import { href } from '../lib/router';
import { sections } from '../lib/content';

export const Footer = () => (
  <footer className="mt-16 border-t-2 border-[var(--color-ink)] bg-[#f6f6f4]">
    <div className="container-news py-10 grid gap-8 md:grid-cols-3">
      <div>
        <p className="font-serif font-bold text-[26px] text-[var(--color-brand)] leading-tight">Kőszeg és Vidéke</p>
        <p className="mt-2 text-[15px] text-[var(--color-ink-2)] leading-relaxed">
          Kőszeg város és környéke polgárainak ingyenes havilapja. Kiadja a Jurisics-vár Művelődési Központ és Várszínház.
        </p>
      </div>

      <div>
        <h2 className="font-sans text-[15px] font-bold mb-3">Rovatok</h2>
        <ul className="grid grid-cols-2 gap-y-2 text-[15px]">
          {sections.map((s) => (
            <li key={s.slug}>
              <a className="hover:underline" href={href('rovat', s.slug)}>{s.name}</a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-sans text-[15px] font-bold mb-3">Archívum</h2>
        <p className="text-[15px] text-[var(--color-ink-2)] leading-relaxed mb-3">
          A 2012 óta megjelent összes lapszám PDF-ben olvasható, szövegük kereshető.
        </p>
        <a className="btn" href={href('archivum')}>Lapszámok böngészése</a>
      </div>
    </div>
    <div className="border-t border-[var(--color-line)]">
      <div className="container-news py-4 meta flex flex-wrap justify-between gap-x-6 gap-y-2">
        <span className="flex flex-wrap gap-x-5 gap-y-2">
          <a className="hover:underline" href={href('impresszum')}>Impresszum</a>
          <a className="hover:underline" href={href('adatvedelem')}>Adatvédelem</a>
          <a className="hover:underline" href={href('sutik')}>Sütik</a>
          <a className="hover:underline" href={href('hirdetesek')}>Hirdessen nálunk</a>
        </span>
        <a className="hover:underline" href={href('admin')}>Szerkesztőségi belépés</a>
      </div>
    </div>
    <div className="bg-[#10263f] text-white/80">
      <div className="container-news py-5 text-[13px] leading-relaxed flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Kőszeg és Vidéke. Minden jog fenntartva. A lapban megjelent írások, fotók és grafikák
          a kiadó engedélye nélkül nem közölhetők újra.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end shrink-0">
          <span>
            Powered by{' '}
            <a className="font-semibold text-white underline underline-offset-2" href="https://visitkoszeg.hu" target="_blank" rel="noopener noreferrer">
              visitkoszeg.hu
            </a>
          </span>
          <span>
            Software by{' '}
            <a className="font-semibold text-white underline underline-offset-2" href="mailto:avar.szilveszter@gmail.com">
              SA Software &amp; Network Solutions
            </a>
          </span>
        </p>
      </div>
    </div>
  </footer>
);
