import React from 'react';
import { FileEdit, CheckCircle2, Clock, BookOpen, PlusCircle, ArrowRight, Eye, Edit3 } from 'lucide-react';

export const AdminDashboard = ({ articles, issues, onNavigateTab, onEditArticle, onViewArticle }) => {
  // Counts matching Section 9 exactly:
  const draftsCount = articles.filter(a => a.status === 'draft' || a.status === 'vázlat').length;
  const reviewCount = articles.filter(a => a.status === 'review' || a.status === 'ellenőrzés alatt').length;
  const publishedCount = articles.filter(a => a.status === 'published' || a.status === 'publikált').length;
  
  const currentIssue = issues.find(i => i.status === 'published') || issues[0];

  const recentArticles = articles.slice(0, 6);

  const getStatusBadge = (status) => {
    if (status === 'published' || status === 'publikált') {
      return <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-200">Publikált</span>;
    }
    if (status === 'review' || status === 'ellenőrzés alatt') {
      return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">Ellenőrzés alatt</span>;
    }
    return <span className="inline-flex items-center gap-1 bg-neutral-200 text-neutral-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-neutral-300">Vázlat</span>;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E5DFC9] p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#121215] uppercase tracking-tight">
            SZERKESZTŐSÉGI DASHBOARD
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[#626270] mt-0.5">
            Kőszeg és Vidéke · Digitális szerkesztőségi vezérlőpult
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('new-article')}
          className="bg-[#8B1E2F] hover:bg-[#701624] text-white px-4 py-2.5 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all shadow inline-flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> Új Cikk Írása
        </button>
      </div>

      {/* SECTION 9 STATS CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Vázlatok */}
        <div className="bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="font-serif text-xs uppercase font-bold text-neutral-600">Vázlatok</span>
            <FileEdit className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="text-3xl font-bold font-serif text-[#121215]">{draftsCount}</div>
          <p className="text-[11px] text-neutral-500 mt-1 font-sans">Szerkesztés alatti vázlat cikk</p>
        </div>

        {/* Ellenőrzés alatt */}
        <div className="bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="font-serif text-xs uppercase font-bold text-amber-800">Ellenőrzés alatt</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold font-serif text-[#121215]">{reviewCount}</div>
          <p className="text-[11px] text-neutral-500 mt-1 font-sans">Jóváhagyásra váró kézirat</p>
        </div>

        {/* Publikált cikkek */}
        <div className="bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-green-600 mb-2">
            <span className="font-serif text-xs uppercase font-bold text-green-800">Publikált cikkek</span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold font-serif text-[#121215]">{publishedCount}</div>
          <p className="text-[11px] text-neutral-500 mt-1 font-sans">Az online újságban megjelent</p>
        </div>

        {/* Aktuális lapszám */}
        <div className="bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm border-l-4 border-l-[#8B1E2F]">
          <div className="flex items-center justify-between text-[#8B1E2F] mb-2">
            <span className="font-serif text-xs uppercase font-bold text-[#8B1E2F]">Aktuális Lapszám</span>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-base font-bold font-serif text-[#121215] truncate">
            {currentIssue ? currentIssue.title : '2026. Szeptember'}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1 font-sans">
            {currentIssue ? `${currentIssue.issue_number}. szám · ${currentIssue.year}` : 'Aktív lapszám'}
          </p>
        </div>

      </div>

      {/* RECENT ARTICLES TABLE */}
      <div className="bg-white border border-[#E5DFC9] rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E5DFC9] flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg text-[#121215]">
            Legutóbbi Cikkek & Kéziratok
          </h3>
          <button
            onClick={() => onNavigateTab('articles')}
            className="text-xs font-serif font-bold text-[#8B1E2F] hover:underline inline-flex items-center gap-1"
          >
            Minden cikk megtekintése <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E5DFC9] font-serif text-[#626270]">
                <th className="py-3 px-4 font-bold">Cikk címe</th>
                <th className="py-3 px-4 font-bold">Státusz</th>
                <th className="py-3 px-4 font-bold">Módosítva</th>
                <th className="py-3 px-4 font-bold text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE6D8]">
              {recentArticles.map((art) => (
                <tr key={art.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                  <td className="py-3 px-4 font-serif font-semibold text-[#121215]">
                    {art.title}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(art.status)}
                  </td>
                  <td className="py-3 px-4 text-neutral-500 font-sans">
                    {new Date(art.updated_at || art.created_at).toLocaleDateString('hu-HU')}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => onEditArticle(art)}
                      className="p-1.5 text-neutral-700 hover:text-[#8B1E2F] hover:bg-neutral-100 rounded"
                      title="Szerkesztés"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onViewArticle(art.id)}
                      className="p-1.5 text-neutral-700 hover:text-[#8B1E2F] hover:bg-neutral-100 rounded"
                      title="Előnézet"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
