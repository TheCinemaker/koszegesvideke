import React, { useState } from 'react';
import { BookOpen, Plus, ArrowUp, ArrowDown, Edit2, Trash2, Calendar, FileText, Upload, Check } from 'lucide-react';
import { dataService } from '../../services/dataService';

export const AdminIssuesManager = ({ issues, articles, onSaveIssue, onUpdateArticlesOrder }) => {
  const [selectedIssueId, setSelectedIssueId] = useState(issues[0]?.id || null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New Issue form state
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(10);
  const [issueNumber, setIssueNumber] = useState(10);
  const [title, setTitle] = useState('XLVIII. Évfolyam · 2026. Októberi szám');
  const [coverImage, setCoverImage] = useState('');
  const [publicationDate, setPublicationDate] = useState('2026-10-15');
  const [pdfUrl, setPdfUrl] = useState('');

  const selectedIssue = issues.find(i => i.id === selectedIssueId) || issues[0];

  // Issue articles ordered by order_index
  const issueArticles = selectedIssue
    ? articles
        .filter(a => a.issue_id === selectedIssue.id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    : [];

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    const newIssuePayload = {
      year: Number(year),
      month: Number(month),
      issue_number: Number(issueNumber),
      publication_date: publicationDate,
      title: title || `XLVIII. Évfolyam · ${year}. ${month}. szám`,
      cover_image: coverImage || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200',
      pdf_url: pdfUrl || null,
      status: 'published'
    };

    const saved = await onSaveIssue(newIssuePayload);
    setShowCreateForm(false);
    if (saved) setSelectedIssueId(saved.id);
  };

  // Reorder articles (Up / Down) (Section 12)
  const moveArticle = async (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === issueArticles.length - 1) return;

    const newOrder = [...issueArticles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map(a => a.id);
    await onUpdateArticlesOrder(selectedIssue.id, orderedIds);
  };

  const monthNames = [
    'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E5DFC9] p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#121215] uppercase tracking-tight">
            LAPSZÁMOK & CIKK SORREND KEZELŐ
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[#626270] mt-0.5">
            Új lapszámok közzététele és az adott lapszám cikkeinek átrendezése (Drag & Reorder)
          </p>
        </div>

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-[#8B1E2F] hover:bg-[#701624] text-white px-4 py-2.5 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all shadow inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {showCreateForm ? 'Mégse' : 'Új Lapszám Létrehozása'}
        </button>
      </div>

      {/* CREATE NEW ISSUE FORM */}
      {showCreateForm && (
        <form onSubmit={handleCreateIssue} className="bg-white border-2 border-[#8B1E2F] p-6 rounded-xl shadow-md space-y-4 animate-fadeIn">
          <h3 className="font-serif font-bold text-lg text-[#8B1E2F] border-b border-[#E5DFC9] pb-2">
            Új Lapszám Hozzáadása az Archívumhoz
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Év *</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" required />
            </div>
            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Hónap (1-12) *</label>
              <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" required />
            </div>
            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Lapszám Száma *</label>
              <input type="number" value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Lapszám Hivatalos Címe *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" required />
            </div>
            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Publikálási Dátum *</label>
              <input type="date" value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Címlap Kép URL</label>
              <input type="text" placeholder="https://..." value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" />
            </div>
            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Eredeti PDF URL (Digitalizált)</label>
              <input type="text" placeholder="https://.../koszeg_2026_09.pdf" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" />
            </div>
          </div>

          <button type="submit" className="bg-[#8B1E2F] text-white px-5 py-2 rounded text-xs font-serif font-bold uppercase tracking-wider">
            Lapszám Mentése
          </button>
        </form>
      )}

      {/* MAIN TWO-COLUMN ISSUES & ARTICLE REORDERING (Section 12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 4 cols: Issues Select List */}
        <div className="lg:col-span-4 bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm space-y-3">
          <h3 className="font-serif font-bold text-sm text-[#121215] uppercase tracking-wider border-b border-[#E5DFC9] pb-2">
            Megjelent Lapszámok
          </h3>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {issues.map((iss) => {
              const isSelected = iss.id === selectedIssueId;
              return (
                <div
                  key={iss.id}
                  onClick={() => setSelectedIssueId(iss.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-[#FAF2F3] border-[#8B1E2F] shadow-sm'
                      : 'bg-white border-[#E5DFC9] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {iss.cover_image && (
                    <img src={iss.cover_image} alt="" className="w-10 h-10 object-cover rounded border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-[#8B1E2F] font-serif block">
                      {monthNames[iss.month - 1] || 'Szeptember'} · {iss.year} ({iss.issue_number}. szám)
                    </span>
                    <h4 className="font-serif font-bold text-xs text-[#121215] truncate">
                      {iss.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 8 cols: Articles Order Management inside Selected Issue (Section 12) */}
        <div className="lg:col-span-8 bg-white border border-[#E5DFC9] p-6 rounded-xl shadow-sm space-y-4">
          
          {selectedIssue ? (
            <>
              <div className="border-b border-[#E5DFC9] pb-3 flex justify-between items-center">
                <div>
                  <span className="text-xs font-serif font-bold uppercase tracking-widest text-[#8B1E2F]">
                    KIVÁLASZTOTT LAPSZÁM
                  </span>
                  <h2 className="font-serif font-black text-xl text-[#121215]">
                    {selectedIssue.title}
                  </h2>
                </div>
                <span className="text-xs font-serif bg-[#FAF8F5] px-3 py-1 rounded border border-[#D6CEBE]">
                  {issueArticles.length} cikk az adott számban
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-serif text-neutral-500 italic">
                  A cikkek sorrendjét a nyilak segítségével szabhatod testre (a sorrend automatikusan frissül az online kiadásban):
                </p>

                {issueArticles.map((art, index) => (
                  <div 
                    key={art.id}
                    className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-[#D6CEBE] rounded-lg hover:border-[#8B1E2F] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#8B1E2F] text-white font-serif font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#121215]">
                          {art.title}
                        </h4>
                        <span className="text-[11px] text-neutral-500 font-sans">
                          {art.lead ? art.lead.substring(0, 70) + '...' : '–'}
                        </span>
                      </div>
                    </div>

                    {/* Up / Down reorder controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveArticle(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 bg-white border border-[#D6CEBE] hover:bg-[#8B1E2F] hover:text-white rounded disabled:opacity-30 transition-colors"
                        title="Mozgatás felfelé"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveArticle(index, 'down')}
                        disabled={index === issueArticles.length - 1}
                        className="p-1.5 bg-white border border-[#D6CEBE] hover:bg-[#8B1E2F] hover:text-white rounded disabled:opacity-30 transition-colors"
                        title="Mozgatás lefelé"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {issueArticles.length === 0 && (
                  <div className="p-8 text-center font-serif italic text-neutral-500 bg-[#FAF8F5] rounded-lg border border-[#D6CEBE]">
                    Ebben a lapszámban még nincsenek rögzített cikkek.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center font-serif italic text-neutral-500">
              Válassz egy lapszámot a bal oldali listából!
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
