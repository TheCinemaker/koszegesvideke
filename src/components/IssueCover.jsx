import React from 'react';
import { href } from '../lib/router';
import { issueTitle, pdfLink } from '../lib/content';

// Lapszám-borító. A 2026-os lapszámok a cikklistájukra visznek, a régebbiek az eredeti PDF-re.
export const IssueCover = ({ issue }) => {
  const hasArticles = issue.articleCount > 0;
  const link = hasArticles ? href('lapszam', issue.id) : pdfLink(issue);
  const external = !hasArticles;
  return (
    <a
      href={link}
      className="headline-link block"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <div className="img-frame border border-[var(--color-line)]" style={{ aspectRatio: '1241 / 1737' }}>
        {issue.cover ? (
          <img src={issue.cover} alt={`A ${issueTitle(issue)} lapszám címlapja`} loading="lazy" style={{ objectFit: 'cover', objectPosition: 'top' }} />
        ) : null}
      </div>
      <p className="headline text-[17px] mt-2">{issueTitle(issue)}</p>
      <p className="meta">
        {hasArticles ? `${issue.articleCount} cikk · ` : ''}
        {issue.pages} oldal{external ? ' · PDF' : ''}
      </p>
    </a>
  );
};
