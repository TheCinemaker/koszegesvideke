import React from 'react';
import impresszum from '../content/legal/impresszum.md?raw';
import adatvedelem from '../content/legal/adatvedelem.md?raw';
import sutik from '../content/legal/sutik.md?raw';

export const LEGAL_PAGES = {
  impresszum: { title: 'Impresszum', source: impresszum },
  adatvedelem: { title: 'Adatvédelmi tájékoztató', source: adatvedelem },
  sutik: { title: 'Süti-tájékoztató', source: sutik },
};

// Soron belüli jelölés: **félkövér** és [szöveg](link) – React-elemekként, nyers HTML nélkül
function inline(text, keyBase) {
  const out = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyBase}-${k++}`}>{m[1]}</strong>);
    else {
      const external = /^https?:/.test(m[3]);
      out.push(
        <a key={`${keyBase}-${k++}`} href={m[3]} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {m[2]}
        </a>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Egyszerű Markdown: # / ## / ### címek, - lista, bekezdések (a bekezdésen belüli sortörés megmarad)
function renderMarkdown(src) {
  const blocks = src.replace(/\r/g, '').trim().split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split('\n');
    if (lines[0].startsWith('# ')) return null; // az oldal címe külön jelenik meg
    if (lines[0].startsWith('## ')) return <h2 key={bi}>{inline(lines[0].slice(3), bi)}</h2>;
    if (lines[0].startsWith('### ')) return <h3 key={bi}>{inline(lines[0].slice(4), bi)}</h3>;
    if (lines.every((l) => l.startsWith('- '))) {
      return (
        <ul key={bi}>
          {lines.map((l, li) => (
            <li key={li}>{inline(l.slice(2), `${bi}-${li}`)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={bi}>
        {lines.map((l, li) => (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {inline(l, `${bi}-${li}`)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

export const LegalPage = ({ page }) => {
  const doc = LEGAL_PAGES[page];
  return (
    <div className="container-news pt-8 sm:pt-12">
      <article className="max-w-[720px] mx-auto">
        <h1 className="article-title">{doc.title}</h1>
        <div className="legal-body mt-8">{renderMarkdown(doc.source)}</div>
      </article>
    </div>
  );
};
