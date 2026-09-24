import React, { useEffect, useState } from 'react';
import { FileText, Link2 } from 'lucide-react';
import { ArticleCard } from '../components/ArticleCard';
import { href } from '../lib/router';
import { getArticle, getIssue, sectionName, formatDate, issueTitle, pdfLink, articlesOfSection, articlesOfIssue, loadArticleBody } from '../lib/content';

const Figure = ({ image, eager }) => (
  <figure>
    <img
      src={image.src}
      alt={image.caption || ''}
      width={image.w || undefined}
      height={image.h || undefined}
      loading={eager ? 'eager' : 'lazy'}
      className="w-full h-auto"
    />
    {image.caption && <figcaption>{image.caption}</figcaption>}
  </figure>
);

const Block = ({ block }) => {
  if (block.type === 'h3') return <h3>{block.text}</h3>;
  if (block.type === 'box') {
    return (
      <aside className="article-box">
        {block.title && <h4>{block.title}</h4>}
        {(block.items || []).map((b, i) => (b.type === 'h3' ? <h4 key={i}>{b.text}</h4> : <p key={i}>{b.text}</p>))}
      </aside>
    );
  }
  if (block.type === 'html') return <div dangerouslySetInnerHTML={{ __html: block.html }} />;
  return <p className={block.strong ? 'strong' : undefined}>{block.text}</p>;
};

// A további képeket egyenletesen elosztjuk a bekezdések között, hogy a szöveg ne egy tömbben álljon.
function interleave(blocks, images) {
  if (!images.length) return blocks.map((b) => ({ block: b }));
  const paraIdx = blocks.map((b, i) => (b.type === 'p' ? i : -1)).filter((i) => i >= 0);
  const slots = new Map();
  images.forEach((img, k) => {
    const pos = paraIdx[Math.min(paraIdx.length - 1, Math.round(((k + 1) * paraIdx.length) / (images.length + 1)))];
    const at = pos ?? blocks.length - 1;
    slots.set(at, [...(slots.get(at) || []), img]);
  });
  const out = [];
  blocks.forEach((b, i) => {
    out.push({ block: b });
    (slots.get(i) || []).forEach((img) => out.push({ image: img }));
  });
  return out;
}

export const ArticlePage = ({ id }) => {
  const article = getArticle(id);
  const [blocks, setBlocks] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!article) return undefined;
    let alive = true;
    loadArticleBody(article.id)
      .then((b) => alive && setBlocks(b))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [article]);

  useEffect(() => {
    if (article) document.title = `${article.title} – Kőszeg és Vidéke`;
    return () => {
      document.title = 'Kőszeg és Vidéke – Kőszeg város és környéke havilapja';
    };
  }, [article]);

  if (!article) {
    return (
      <div className="container-news py-20 text-center">
        <h1 className="text-[32px]">A cikk nem található</h1>
        <p className="mt-3 text-[18px]"><a className="text-[var(--color-brand)] underline" href={href('home')}>Vissza a címlapra</a></p>
      </div>
    );
  }

  const issue = getIssue(article.issueId);
  const [mainImage, ...otherImages] = article.images;
  const flow = blocks ? interleave(blocks, otherImages) : [];

  const sameSection = articlesOfSection(article.section).filter((a) => a.id !== article.id).slice(0, 4);
  const sameIssue = articlesOfIssue(article.issueId).filter((a) => a.id !== article.id && !sameSection.includes(a)).slice(0, 6);

  const copyLink = () => navigator.clipboard?.writeText(window.location.href);

  return (
    <div className="container-news pt-6 sm:pt-10">
      <article className="max-w-[760px] mx-auto">
        <header>
          <p className="section-label">
            <a className="hover:underline" href={href('rovat', article.section)}>{sectionName(article.section)}</a>
            {article.kicker && <span className="text-[var(--color-ink-2)] font-semibold"> · {article.kicker}</span>}
          </p>
          <h1 className="article-title mt-2">{article.title}</h1>
          {article.deck && <p className="article-deck mt-4">{article.deck}</p>}

          <div className="mt-6 pt-4 border-t border-[var(--color-line)] flex flex-wrap items-center justify-between gap-3">
            <div className="meta text-[15px]">
              {article.author && <p className="font-semibold text-[var(--color-ink)]">{article.author}</p>}
              <p>
                {formatDate(article.date)} · {article.readingMinutes} perc olvasás
              </p>
            </div>
            <button type="button" onClick={copyLink} className="btn text-[14px] py-2" title="Hivatkozás másolása">
              <Link2 className="w-4 h-4" aria-hidden="true" /> Link másolása
            </button>
          </div>
        </header>

        {mainImage && (
          <div className="mt-6">
            <Figure image={mainImage} eager />
          </div>
        )}

        <div className="article-body mt-8" aria-busy={!blocks}>
          {!blocks && !loadError && (
            <div className="space-y-3" aria-label="A cikk betöltése">
              {[100, 96, 98, 90, 94, 60].map((w, i) => (
                <div key={i} className="h-4 rounded bg-[#ececec] animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
          {loadError && (
            <p>
              A cikk szövegét nem sikerült betölteni. Kérjük, frissítse az oldalt, vagy olvassa el az{' '}
              <a href={pdfLink(issue, article.page)} target="_blank" rel="noopener noreferrer">eredeti nyomtatott oldalon</a>.
            </p>
          )}
          {flow.map((item, i) => (item.image ? <Figure key={`img-${i}`} image={item.image} /> : <Block key={i} block={item.block} />))}
        </div>

        {article.photoCredit && <p className="meta mt-2">Fotó: {article.photoCredit}</p>}

        {issue && (
          <div className="mt-10 p-5 bg-[#f6f6f4] border-l-4 border-[var(--color-brand)] text-[16px] leading-relaxed">
            <p>
              Megjelent a Kőszeg és Vidéke{' '}
              <a className="font-semibold text-[var(--color-brand)] underline" href={href('lapszam', issue.id)}>{issueTitle(issue)}</a>{' '}
              lapszámában, a {article.page}. oldalon.
            </p>
            {pdfLink(issue, article.page) && (
              <a
                className="inline-flex items-center gap-2 mt-2 font-semibold text-[var(--color-brand)] underline"
                href={pdfLink(issue, article.page)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="w-4 h-4" aria-hidden="true" /> Az eredeti nyomtatott oldal (PDF)
              </a>
            )}
          </div>
        )}
      </article>

      {sameSection.length > 0 && (
        <section className="max-w-[1000px] mx-auto mt-16" aria-labelledby="kapcsolodo">
          <div className="rule-heading">
            <h2 id="kapcsolodo">További cikkek: {sectionName(article.section)}</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {sameSection.map((a) => (
              <ArticleCard key={a.id} article={a} variant="feature" showSection={false} showLead={false} />
            ))}
          </div>
        </section>
      )}

      {sameIssue.length > 0 && (
        <section className="max-w-[1000px] mx-auto mt-14" aria-labelledby="lapszambol">
          <div className="rule-heading">
            <h2 id="lapszambol">Ugyanebből a lapszámból</h2>
          </div>
          <div className="grid gap-x-10 md:grid-cols-2">
            {sameIssue.map((a) => (
              <ArticleCard key={a.id} article={a} variant="text" showLead={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
