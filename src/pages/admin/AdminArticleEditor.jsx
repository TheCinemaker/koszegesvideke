import React, { useState, useRef } from 'react';
import { Save, Eye, Send, Upload, Image as ImageIcon, Bold, Italic, Heading, List, Quote, Link as LinkIcon, Check, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { dataService, slugify } from '../../services/dataService';

export const AdminArticleEditor = ({ articleToEdit, categories, authors, issues, onSaveSuccess, onCancel }) => {
  const [title, setTitle] = useState(articleToEdit?.title || '');
  const [subtitle, setSubtitle] = useState(articleToEdit?.subtitle || '');
  const [lead, setLead] = useState(articleToEdit?.lead || '');
  const [content, setContent] = useState(articleToEdit?.content || '');
  const [coverImage, setCoverImage] = useState(articleToEdit?.cover_image || '');
  const [categoryId, setCategoryId] = useState(articleToEdit?.category_id || categories[0]?.id || '');
  const [authorId, setAuthorId] = useState(articleToEdit?.author_id || authors[0]?.id || '');
  const [reporterId, setReporterId] = useState(articleToEdit?.reporter_id || authors[0]?.id || '');
  const [issueId, setIssueId] = useState(articleToEdit?.issue_id || issues[0]?.id || '');
  const [status, setStatus] = useState(articleToEdit?.status || 'draft');
  const [pageStart, setPageStart] = useState(articleToEdit?.page_start || 1);
  const [pageEnd, setPageEnd] = useState(articleToEdit?.page_end || 1);

  const [uploading, setUploading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);

  // Image Upload handler for Supabase Storage or Local DataURL
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await dataService.uploadImage(file, 'article-images');
      setCoverImage(url);
    } catch (err) {
      alert('Kép feltöltési hiba: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Insert Rich Text Formatting into Contentable / Content area
  const insertFormatting = (tag, wrapWith = '') => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || 'Kijelölt szöveg';

    let replacement = '';
    if (tag === 'b') replacement = `<b>${selectedText}</b>`;
    else if (tag === 'i') replacement = `<i>${selectedText}</i>`;
    else if (tag === 'h2') replacement = `\n<h2>${selectedText}</h2>\n`;
    else if (tag === 'h3') replacement = `\n<h3>${selectedText}</h3>\n`;
    else if (tag === 'p') replacement = `\n<p>${selectedText}</p>\n`;
    else if (tag === 'ul') replacement = `\n<ul>\n  <li>${selectedText}</li>\n</ul>\n`;
    else if (tag === 'quote') replacement = `\n<blockquote>„${selectedText}”</blockquote>\n`;
    else if (tag === 'link') {
      const url = prompt('Add meg a hivatkozás URL címét:', 'https://');
      if (url) replacement = `<a href="${url}" target="_blank" rel="noopener">${selectedText}</a>`;
      else return;
    } else if (tag === 'img') {
      const imgUrl = prompt('Kép beszúrása (kép URL-je):', coverImage || 'https://');
      if (imgUrl) replacement = `\n<img src="${imgUrl}" alt="Kép illusztráció" />\n`;
      else return;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  const handleSave = async (targetStatus) => {
    if (!title.trim()) {
      alert('Kérlek add meg a cikk címét!');
      return;
    }

    setSaving(true);
    const slug = slugify(title);

    const articlePayload = {
      ...(articleToEdit?.id ? { id: articleToEdit.id } : {}),
      title,
      slug,
      subtitle,
      lead,
      content,
      cover_image: coverImage,
      category_id: categoryId,
      author_id: authorId,
      reporter_id: reporterId,
      issue_id: issueId,
      status: targetStatus,
      page_start: Number(pageStart),
      page_end: Number(pageEnd)
    };

    try {
      const saved = await dataService.saveArticle(articlePayload);
      
      if (targetStatus === 'published' || targetStatus === 'publikált') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onSaveSuccess(saved, targetStatus);
    } catch (err) {
      alert('Mentési hiba történt: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E5DFC9] p-6 rounded-xl shadow-sm">
        <div>
          <span className="text-xs font-serif font-bold text-[#8B1E2F] uppercase tracking-widest block mb-1">
            {articleToEdit ? 'CIKK SZERKESZTÉSE' : 'ÚJ CIKK LÉTREHOZÁSA'}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#121215]">
            {title || 'Névtelen Cikk Vázlat'}
          </h1>
        </div>

        {/* Top Action Buttons (Section 10) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 px-3.5 py-2 rounded-lg text-xs font-serif font-bold transition-all inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4 text-neutral-600" /> Mentés vázlatként
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="bg-[#FAF8F5] border border-[#D6CEBE] hover:bg-[#8B1E2F] hover:text-white text-[#121215] px-3.5 py-2 rounded-lg text-xs font-serif font-bold transition-all inline-flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-[#8B1E2F]" /> Előnézet
          </button>

          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="bg-[#8B1E2F] hover:bg-[#701624] text-white px-4 py-2 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" /> Publikálás
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 8 cols: Title, Lead, Rich Text Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Cím (Section 10: Nagy szövegmező) */}
          <div className="bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#121215] mb-1">
                Cikk Címe *
              </label>
              <textarea
                rows={2}
                placeholder="Írd ide a cikk fő címét..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 font-serif text-2xl font-bold text-[#121215] border border-[#D6CEBE] rounded-lg focus:outline-none focus:border-[#8B1E2F] transition-all bg-[#FAF8F5]"
              />
            </div>

            {/* Alcím */}
            <div>
              <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#626270] mb-1">
                Alcím / Kiemelés
              </label>
              <input
                type="text"
                placeholder="Opcionális alcím..."
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full p-2.5 font-serif text-sm italic text-[#121215] border border-[#D6CEBE] rounded-lg focus:outline-none focus:border-[#8B1E2F] bg-[#FAF8F5]"
              />
            </div>

            {/* Lead */}
            <div>
              <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#8B1E2F] mb-1">
                Lead (Bevezető Összefoglaló Szöveg)
              </label>
              <textarea
                rows={3}
                placeholder="Rövid, figyelemfelkeltő felvezetés, amely a kártyákon és a cikk elején kiemelve jelenik meg..."
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                className="w-full p-3 font-serif text-sm font-semibold text-[#121215] border border-[#D6CEBE] rounded-lg focus:outline-none focus:border-[#8B1E2F] bg-[#FAF2F3]/40"
              />
            </div>
          </div>

          {/* Rich Text Content Editor (Section 10) */}
          <div className="bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between border-b border-[#E5DFC9] pb-3 gap-2">
              <label className="text-xs font-serif font-bold uppercase tracking-wider text-[#121215]">
                Cikk Teljes Szövege (Rich Text Editor)
              </label>
              
              {/* Rich Text Toolbar */}
              <div className="flex flex-wrap items-center gap-1 bg-[#FAF8F5] p-1 border border-[#D6CEBE] rounded-md">
                <button 
                  type="button" 
                  onClick={() => insertFormatting('b')}
                  className="p-1.5 hover:bg-white rounded text-neutral-700 hover:text-[#8B1E2F]"
                  title="Félkövér (<b>)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={() => insertFormatting('i')}
                  className="p-1.5 hover:bg-white rounded text-neutral-700 hover:text-[#8B1E2F]"
                  title="Dőlt (<i>)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <span className="text-neutral-300">|</span>
                <button 
                  type="button" 
                  onClick={() => insertFormatting('h2')}
                  className="p-1.5 hover:bg-white rounded text-neutral-700 hover:text-[#8B1E2F] font-serif font-bold text-xs"
                  title="Alcím (H2)"
                >
                  H2
                </button>
                <button 
                  type="button" 
                  onClick={() => insertFormatting('h3')}
                  className="p-1.5 hover:bg-white rounded text-neutral-700 hover:text-[#8B1E2F] font-serif font-bold text-xs"
                  title="Kis Alcím (H3)"
                >
                  H3
                </button>
                <span className="text-neutral-300">|</span>
                <button 
                  type="button" 
                  onClick={() => insertFormatting('ul')}
                  className="p-1.5 hover:bg-white rounded text-neutral-700 hover:text-[#8B1E2F]"
                  title="Felsorolás (<ul>)"
                >
                  <List className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={() => insertFormatting('quote')}
                  className="p-1.5 hover:bg-white rounded text-neutral-700 hover:text-[#8B1E2F]"
                  title="Idézet (<blockquote>)"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={() => insertFormatting('link')}
                  className="p-1.5 hover:bg-white rounded text-neutral-700 hover:text-[#8B1E2F]"
                  title="Link beszúrása (<a href>)"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={() => insertFormatting('img')}
                  className="p-1.5 hover:bg-white rounded text-neutral-700 hover:text-[#8B1E2F]"
                  title="Kép beszúrása (<img>)"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <textarea
              ref={editorRef}
              rows={16}
              placeholder="Írd ide a cikk teljes törzsszövegét. Használd a fenti formázó gombokat a bekezdésekhez, címsorokhoz és idézetekhez..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 font-serif text-base text-[#121215] leading-relaxed border border-[#D6CEBE] rounded-lg focus:outline-none focus:border-[#8B1E2F] bg-white font-serif"
            />
          </div>

        </div>

        {/* Right 4 cols: Metadata & Image Upload (Section 10) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Főkép Upload Card */}
          <div className="bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm space-y-3">
            <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#121215]">
              Cikk Fő Kép * (Supabase Storage)
            </label>

            {coverImage ? (
              <div className="relative aspect-[16/10] rounded-lg overflow-hidden border border-[#D6CEBE]">
                <img src={coverImage} alt="Főkép preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                  title="Kép törlése"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#D6CEBE] rounded-lg p-6 text-center hover:border-[#8B1E2F] transition-colors bg-[#FAF8F5]">
                <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-xs font-serif text-neutral-600 mb-2">
                  Kattints a kép feltöltéséhez (Supabase Storage / Képválasztó)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                  id="cover-upload-input"
                />
                <label
                  htmlFor="cover-upload-input"
                  className="cursor-pointer bg-[#8B1E2F] hover:bg-[#701624] text-white px-3 py-1.5 rounded text-xs font-serif font-bold inline-block"
                >
                  {uploading ? 'Feltöltés...' : 'Kép Kiválasztása'}
                </label>
              </div>
            )}

            <div>
              <span className="text-[11px] text-neutral-400 block mb-1">Vagy adj meg közvetlen kép URL címet:</span>
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full p-2 text-xs border border-[#D6CEBE] rounded bg-[#FAF8F5]"
              />
            </div>
          </div>

          {/* Metadata Dropdowns */}
          <div className="bg-white border border-[#E5DFC9] p-5 rounded-xl shadow-sm space-y-4">
            
            {/* Kategória Dropdown */}
            <div>
              <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#121215] mb-1">
                Kategória *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 font-serif text-xs border border-[#D6CEBE] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#8B1E2F]"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Szerző Dropdown */}
            <div>
              <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#121215] mb-1">
                Szerző *
              </label>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full p-2.5 font-serif text-xs border border-[#D6CEBE] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#8B1E2F]"
              >
                {authors.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </div>

            {/* Riporter Dropdown */}
            <div>
              <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#626270] mb-1">
                Riporter
              </label>
              <select
                value={reporterId}
                onChange={(e) => setReporterId(e.target.value)}
                className="w-full p-2.5 font-serif text-xs border border-[#D6CEBE] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#8B1E2F]"
              >
                {authors.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Lapszám Dropdown */}
            <div>
              <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#121215] mb-1">
                Lapszám
              </label>
              <select
                value={issueId}
                onChange={(e) => setIssueId(e.target.value)}
                className="w-full p-2.5 font-serif text-xs border border-[#D6CEBE] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#8B1E2F]"
              >
                {issues.map(i => (
                  <option key={i.id} value={i.id}>{i.title}</option>
                ))}
              </select>
            </div>

            {/* PDF Oldalszám hivatkozás */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECE6D8]">
              <div>
                <label className="block text-[11px] font-serif text-neutral-500">Kezdő oldal</label>
                <input
                  type="number"
                  min="1"
                  value={pageStart}
                  onChange={(e) => setPageStart(e.target.value)}
                  className="w-full p-2 text-xs border border-[#D6CEBE] rounded bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-serif text-neutral-500">Záró oldal</label>
                <input
                  type="number"
                  min="1"
                  value={pageEnd}
                  onChange={(e) => setPageEnd(e.target.value)}
                  className="w-full p-2 text-xs border border-[#D6CEBE] rounded bg-[#FAF8F5]"
                />
              </div>
            </div>

            {/* Státusz Dropdown */}
            <div>
              <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#8B1E2F] mb-1">
                Státusz
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 font-serif text-xs font-bold border border-[#D6CEBE] rounded-lg bg-white focus:outline-none focus:border-[#8B1E2F]"
              >
                <option value="draft">Vázlat (Szerkesztés alatt)</option>
                <option value="review">Ellenőrzés alatt (Jóváhagyásra vár)</option>
                <option value="published">Publikált (Megjelenik az oldalon)</option>
              </select>
            </div>

          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleSave(status)}
              disabled={saving}
              className="w-full bg-[#8B1E2F] hover:bg-[#701624] text-white py-3 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Mentés És Frissítés
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-xs font-serif text-neutral-500 hover:text-neutral-800"
            >
              Mégse / Vissza
            </button>
          </div>

        </div>

      </div>

      {/* LIVE PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#FAF8F5] w-full max-w-3xl rounded-xl max-h-[90vh] overflow-y-auto p-6 sm:p-10 shadow-2xl relative border-2 border-[#8B1E2F]">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 bg-neutral-200 hover:bg-neutral-300 p-2 rounded-full"
            >
              <X className="w-5 h-5 text-neutral-700" />
            </button>

            <div className="text-center mb-6">
              <span className="text-xs font-serif font-bold uppercase tracking-widest text-[#8B1E2F] bg-[#FAF2F3] px-3 py-1 rounded-full border border-[#F0D5D9]">
                ÉLŐ ELŐNÉZET · KŐSZEG ÉS VIDÉKE
              </span>
              <h1 className="font-serif text-3xl font-black text-[#121215] mt-3">
                {title || 'Cikk Címe'}
              </h1>
              {subtitle && <h3 className="font-serif italic text-[#626270] mt-1">„{subtitle}”</h3>}
            </div>

            {coverImage && (
              <img src={coverImage} alt="Cover preview" className="w-full max-h-[350px] object-cover rounded-lg mb-6 border" />
            )}

            {lead && (
              <div className="bg-[#FAF2F3] p-4 rounded border-l-4 border-[#8B1E2F] font-serif font-semibold mb-6">
                {lead}
              </div>
            )}

            <div className="article-body font-serif leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: content }} />

            <div className="text-center border-t border-[#D6CEBE] pt-4">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="bg-[#8B1E2F] text-white px-6 py-2 rounded text-xs font-serif font-bold"
              >
                Előnézet Bezárása
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
