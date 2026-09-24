import React from 'react';
import { href } from '../lib/router';
import { sectionName, formatDate } from '../lib/content';

const Photo = ({ image, ratio = '3 / 2', eager = false }) =>
  image ? (
    <div className="img-frame card-photo" style={{ aspectRatio: ratio }}>
      <img src={image.src} alt={image.caption || ''} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </div>
  ) : null;

const Label = ({ article, show }) =>
  show ? <p className="section-label mb-1.5">{article.kicker && article.kicker.length < 40 ? article.kicker : sectionName(article.section)}</p> : null;

const Meta = ({ article }) => (
  <p className="meta mt-2.5">
    {article.author && article.author.length < 40 && <span className="font-semibold text-[var(--color-ink-2)]">{article.author} · </span>}
    <span>{formatDate(article.date)}</span>
  </p>
);

/**
 * variant:
 *   hero     – vezető cikk: nagy kép, nagy cím, bevezető
 *   wide     – széles kiemelés: kép balra, cím és bevezető jobbra
 *   feature  – kép felül, közepes cím, bevezető
 *   small    – kép felül, kisebb cím, bevezető nélkül
 *   compact  – cím balra, kis kép jobbra
 *   row      – listaelem: cím és bevezető balra, kép jobbra
 *   text     – kép nélküli cím + rövid bevezető
 */
export const ArticleCard = ({ article, variant = 'feature', showLead = true, showSection = true }) => {
  const image = article.images[0];
  const link = href('cikk', article.id);
  const lead = showLead ? article.lead : null;

  if (variant === 'hero') {
    return (
      <article>
        <a href={link} className="headline-link block">
          <Photo image={image} ratio="16 / 10" eager />
          <div className="mt-4">
            <Label article={article} show={showSection} />
            <h2 className="headline text-[30px] sm:text-[42px] leading-[1.12]">{article.title}</h2>
          </div>
        </a>
        {lead && <p className="lead-text text-[19px] sm:text-[21px] mt-3">{lead}</p>}
        <Meta article={article} />
      </article>
    );
  }

  if (variant === 'wide') {
    return (
      <article>
        <a href={link} className="headline-link grid gap-5 md:grid-cols-12 items-start">
          <div className="md:col-span-7">
            <Photo image={image} ratio="3 / 2" />
          </div>
          <div className="md:col-span-5">
            <Label article={article} show={showSection} />
            <h3 className="headline text-[26px] sm:text-[30px] leading-[1.15]">{article.title}</h3>
            {lead && <p className="lead-text text-[18px] mt-3 line-clamp-6">{lead}</p>}
            <Meta article={article} />
          </div>
        </a>
      </article>
    );
  }

  if (variant === 'small') {
    return (
      <article>
        <a href={link} className="headline-link block">
          <Photo image={image} ratio="4 / 3" />
          <div className="mt-3">
            <Label article={article} show={showSection} />
            <h3 className="headline text-[19px]">{article.title}</h3>
          </div>
        </a>
        <Meta article={article} />
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article>
        <a href={link} className="headline-link grid grid-cols-[1fr_96px] gap-4 items-start">
          <div>
            <Label article={article} show={showSection} />
            <h3 className="headline text-[19px]">{article.title}</h3>
            <Meta article={article} />
          </div>
          {image ? <Photo image={image} ratio="1 / 1" /> : <span />}
        </a>
      </article>
    );
  }

  if (variant === 'row') {
    return (
      <article className="py-5 border-b border-[var(--color-line)] last:border-b-0">
        <a href={link} className="headline-link grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_210px] gap-4 sm:gap-6 items-start">
          <div>
            <Label article={article} show={showSection} />
            <h3 className="headline text-[20px] sm:text-[24px]">{article.title}</h3>
            {lead && <p className="lead-text text-[16px] sm:text-[17px] mt-2 line-clamp-3">{lead}</p>}
            <Meta article={article} />
          </div>
          {image ? <Photo image={image} ratio="4 / 3" /> : <span />}
        </a>
      </article>
    );
  }

  if (variant === 'text') {
    return (
      <article className="py-4 border-b border-[var(--color-line)] last:border-b-0">
        <a href={link} className="headline-link block">
          <Label article={article} show={showSection} />
          <h3 className="headline text-[19px]">{article.title}</h3>
        </a>
        {lead && <p className="lead-text text-[16px] mt-1.5 line-clamp-2">{lead}</p>}
        <Meta article={article} />
      </article>
    );
  }

  return (
    <article>
      <a href={link} className="headline-link block">
        <Photo image={image} />
        <div className={image ? 'mt-3' : ''}>
          <Label article={article} show={showSection} />
          <h3 className="headline text-[22px] sm:text-[23px]">{article.title}</h3>
        </div>
      </a>
      {lead && <p className="lead-text text-[17px] mt-2 line-clamp-4">{lead}</p>}
      <Meta article={article} />
    </article>
  );
};
