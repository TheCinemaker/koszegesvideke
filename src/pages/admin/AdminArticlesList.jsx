import React, { useState } from 'react';
import { PlusCircle, Search, Edit3, Trash2, Eye, Filter } from 'lucide-react';

export const AdminArticlesList = ({ articles, categories, authors, issues, onEditArticle, onCreateArticle, onDeleteArticle, onViewArticle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          art.lead?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'published') matchesStatus = art.status === 'published' || art.status === 'publikált';
      else if (statusFilter === 'review') matchesStatus = art.status === 'review' || art.status === 'ellenőrzés alatt';
      else if (statusFilter === 'draft') matchesStatus = art.status === 'draft' || art.status === 'vázlat';
    }

    const matchesCategory = categoryFilter === 'all' || art.category_id === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '–';
  const getAuthorName = (id) => authors.find(a => a.id === id)?.name || '–';

  const getStatusBadge = (status) => {
    if (status === 'published' || status === 'publikált') {
      return <span className="bg-green-100 text-green-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-green-200">Publikált</span>;
    }
    if (status === 'review' || status === 'ellenőrzés alatt') {
      return <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">Ellenőrzés alatt</span>;
    }
    return <span className="bg-neutral-200 text-neutral-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-neutral-300">Vázlat</span>;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E5DFC9] p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#121215] uppercase tracking-tight">
            CIKKEK KEZELÉSE
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[#626270] mt-0.5">
            Összes rögzített cikk és kézirat áttekintése ({filteredArticles.length} cikk)
          </p>
        </div>

        <button
          onClick={onCreateArticle}
          className="bg-[#8B1E2F] hover:bg-[#701624] text-white px-4 py-2.5 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all shadow inline-flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> Új Cikk Létrehozása
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5DFC9] p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Keresés cikk címe alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#D6CEBE] rounded-lg text-xs font-serif focus:outline-none focus:border-[#8B1E2F]"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-serif text-[#626270]">
            <Filter className="w-3.5 h-3.5" /> Szűrők:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 text-xs font-serif border border-[#D6CEBE] rounded-lg bg-[#FAF8F5]"
          >
            <option value="all">Minden Státusz</option>
            <option value="published">Publikált</option>
            <option value="review">Ellenőrzés alatt</option>
            <option value="draft">Vázlat</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 text-xs font-serif border border-[#D6CEBE] rounded-lg bg-[#FAF8F5]"
          >
            <option value="all">Minden Kategória</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Articles Table */}
      <div className="bg-white border border-[#E5DFC9] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E5DFC9] font-serif text-[#626270]">
                <th className="py-3.5 px-4 font-bold">Kép</th>
                <th className="py-3.5 px-4 font-bold">Cím</th>
                <th className="py-3.5 px-4 font-bold">Kategória</th>
                <th className="py-3.5 px-4 font-bold">Szerző</th>
                <th className="py-3.5 px-4 font-bold">Státusz</th>
                <th className="py-3.5 px-4 font-bold text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE6D8]">
              {filteredArticles.map((art) => (
                <tr key={art.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                  <td className="py-3 px-4">
                    {art.cover_image ? (
                      <img src={art.cover_image} alt="" className="w-12 h-12 object-cover rounded border border-[#D6CEBE]" />
                    ) : (
                      <div className="w-12 h-12 bg-neutral-100 rounded border flex items-center justify-center text-[10px] text-neutral-400 font-serif">Nincs kép</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-serif font-semibold text-[#121215] max-w-xs">
                    <p className="line-clamp-2">{art.title}</p>
                    {art.subtitle && <p className="text-[11px] text-neutral-500 font-normal italic line-clamp-1">„{art.subtitle}”</p>}
                  </td>
                  <td className="py-3 px-4 font-serif text-neutral-700">
                    {getCategoryName(art.category_id)}
                  </td>
                  <td className="py-3 px-4 font-serif text-neutral-700">
                    {getAuthorName(art.author_id)}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(art.status)}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => onViewArticle(art.id)}
                      className="p-1.5 text-neutral-700 hover:text-[#8B1E2F] hover:bg-neutral-100 rounded"
                      title="Megtekintés"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditArticle(art)}
                      className="p-1.5 text-neutral-700 hover:text-[#8B1E2F] hover:bg-neutral-100 rounded"
                      title="Szerkesztés"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Biztosan törölni szeretnéd a(z) "${art.title}" című cikket?`)) {
                          onDeleteArticle(art.id);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Törlés"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredArticles.length === 0 && (
          <div className="p-8 text-center font-serif italic text-neutral-500">
            Nincs a feltételeknek megfelelő cikk.
          </div>
        )}
      </div>

    </div>
  );
};
