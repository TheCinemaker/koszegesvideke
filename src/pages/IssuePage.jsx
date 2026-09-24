import React from 'react';
import { FileText } from 'lucide-react';
import { ArticleCard } from '../components/ArticleCard';
import { href } from '../lib/router';
import { getIssue, articlesOfIssue, issueTitle, formatDate, pdfLink, issues } from '../lib/content';

export const IssuePage = ({ id }) => {
  const issue = getIssue(id);
  if (!issue) {
    return (
      <div className="container-news py-20 text-center">
        <h1 className="text-[32px]">A lapszám nem található</h1>
        <p className="mt-3 text-[18px]"><a className="text-[var(--color-brand)] underline" href={href('archivum')}>Az archívumhoz</a></p>
      </div>
    );
  }
  const list = articlesOfIssue(issue.id);
  const idx = issues.findIndex((i) => i.id === issue.id);
  const newer = issues[idx - 1];
  const older = issues[idx + 1];

  return (
    <div className="container-news pt-8">
      <div className="grid gap-10 md:grid-cols-12">
        <aside className="md:col-span-4 lg:col-span-3">
          {issue.cover && (
            <a href={pdfLink(issue)} target="_blank" rel="noopener noreferrer" className="block border border-[var(--color-line)]">
              <img src={issue.cover} alt={`A ${issueTitle(issue)} lapszám címlapja`} className="w-full h-auto" />
            </a>
          )}
          <a className="btn btn-primary w-full justify-center mt-4" href={pdfLink(issue)} target="_blank" rel="noopener noreferrer">
            <FileText className="w-4 h-4" aria-hidden="true" /> A teljes lapszám PDF-ben
          </a>
          <nav className="flex justify-between gap-2 mt-4 text-[15px]" aria-label="Lapszámok között">
            {older ? <a className="underline" href={older.articleCount ? href('lapszam', older.id) : pdfLink(older)}>← {issueTitle(older)}</a> : <span />}
            {newer ? <a className="underline text-right" href={newer.articleCount ? href('lapszam', newer.id) : pdfLink(newer)}>{issueTitle(newer)} →</a> : <span />}
          </nav>
        </aside>

        <div className="md:col-span-8 lg:col-span-9">
          <header className="border-b-2 border-[var(--color-ink)] pb-4">
            <p className="section-label">Lapszám</p>
            <h1 className="text-[34px] sm:text-[42px] leading-tight">{issueTitle(issue)}</h1>
            <p className="meta mt-1">
              Megjelent: {formatDate(issue.date)} · {issue.pages} oldal
              {issue.volume ? ` · ${issue.volume}. évfolyam` : ''}
            </p>
          </header>

          {list.length === 0 ? (
            <p className="text-[18px] mt-6">Ennek a lapszámnak a tartalma a PDF-ben olvasható.</p>
          ) : (
            <div>
              {list.map((a) => (
                <div key={a.id} className="grid grid-cols-[3.2rem_1fr] gap-3 items-start border-b border-[var(--color-line)] last:border-b-0">
                  <span className="meta pt-6 text-[14px]">{a.page}. old.</span>
                  <ArticleCard article={a} variant="row" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
