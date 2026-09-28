import React from 'react';
import { href } from '../lib/router';
import { sectionName, monthName } from '../lib/content';

// Egységes 3:2-es képkeret minden kártyán. Ha a kép aránya közel van a kerethez, kitölti (alig vág);
// ha nagyon eltér (álló fotó, térkép, plakát), a kép EGÉSZBEN látszik, a maradék helyet a saját
// elmosott, halvány változata tölti ki – így semmi nem lóg ki és semmi nem vágódik le.
const Photo = ({ image, eager = false }) => {
  if (!image) return null;
  const frame = 3 / 2;
  const img = image.w && image.h ? image.w / image.h : frame;
  // a szokásos fotóarányok (kb. 4:3-tól 16:9-ig) kitöltik a keretet; csak a szélsőségesek látszanak egészben
  const fits = img / frame > 0.8 && img / frame < 1.45;
  const alt = image.caption || '';
  return (
    <div className="img-frame card-photo relative overflow-hidden bg-[#f1efe9]" style={{ aspectRatio: '3 / 2' }}>
      {!fits && (
        <img
          src={image.src}
          alt=""
          aria-hidden="true"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 w-full h-full scale-125 blur-2xl saturate-150 opacity-70"
          style={{ objectFit: 'cover' }}
        />
      )}
      <img
        src={image.src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="relative w-full h-full"
        style={{ objectFit: fits ? 'cover' : 'contain' }}
      />
    </div>
  );
};

const Label = ({ article, show }) =>
  show ? <p className="section-label mb-1.5">{article.kicker && article.kicker.length < 40 ? article.kicker : sectionName(article.section)}</p> : null;

// A kártyákon nincs szerző és dátum (a címlapon úgyis egy lapszám cikkei vannak);
// ahol több lapszám cikkei keverednek (rovatoldal), ott csak a lapszám hónapja.
const Meta = ({ article, show }) => {
  if (!show || !article.date) return null;
  const [y, m] = article.date.split('-').map(Number);
  return <p className="meta mt-2">{y}. {monthName(m)}</p>;
};

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
export const ArticleCard = ({ article, variant = 'feature', showLead = true, showSection = true, showDate = false }) => {
  const image = article.images[0];
  const link = href('cikk', article.id);
  const lead = showLead ? article.lead : null;

  if (variant === 'hero') {
    return (
      <article>
        <a href={link} className="headline-link block">
          <Photo image={image} eager />
          <div className="mt-3">
            <Label article={article} show={showSection} />
            <h2 className="headline text-[30px] sm:text-[42px] leading-[1.12]">{article.title}</h2>
          </div>
        </a>
        {lead && <p className="lead-text text-[19px] sm:text-[21px] mt-2">{lead}</p>}
        <Meta article={article} show={showDate} />
      </article>
    );
  }

  if (variant === 'wide') {
    return (
      <article>
        <a href={link} className="headline-link grid gap-5 md:grid-cols-12 items-start">
          <div className="md:col-span-7">
            <Photo image={image} />
          </div>
          <div className="md:col-span-5">
            <Label article={article} show={showSection} />
            <h3 className="headline text-[26px] sm:text-[30px] leading-[1.15]">{article.title}</h3>
            {lead && <p className="lead-text text-[18px] mt-2 line-clamp-6">{lead}</p>}
            <Meta article={article} show={showDate} />
          </div>
        </a>
      </article>
    );
  }

  if (variant === 'small') {
    return (
      <article>
        <a href={link} className="headline-link block">
          <Photo image={image} />
          <div className="mt-3">
            <Label article={article} show={showSection} />
            <h3 className="headline text-[19px]">{article.title}</h3>
          </div>
        </a>
        <Meta article={article} show={showDate} />
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article>
        <a href={link} className="headline-link grid grid-cols-[1fr_112px] gap-4 items-start">
          <div>
            <Label article={article} show={showSection} />
            <h3 className="headline text-[19px]">{article.title}</h3>
            <Meta article={article} show={showDate} />
          </div>
          {image ? <Photo image={image} /> : <span />}
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
            <Meta article={article} show={showDate} />
          </div>
          {image ? <Photo image={image} /> : <span />}
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
        {lead && <p className="lead-text text-[16px] mt-2 line-clamp-2">{lead}</p>}
        <Meta article={article} show={showDate} />
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
      <Meta article={article} show={showDate} />
    </article>
  );
};
