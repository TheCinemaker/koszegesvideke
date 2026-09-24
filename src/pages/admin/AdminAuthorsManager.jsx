import React, { useState } from 'react';
import { Users, UserPlus, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { dataService } from '../../services/dataService';

export const AdminAuthorsManager = ({ authors, onSaveAuthor }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState('szerzo');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');

  const handleEditClick = (auth) => {
    setEditingAuthor(auth);
    setName(auth.name);
    setRole(auth.role);
    setAvatar(auth.avatar || '');
    setBio(auth.bio || '');
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingAuthor(null);
    setName('');
    setRole('szerzo');
    setAvatar('');
    setBio('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      ...(editingAuthor ? { id: editingAuthor.id } : {}),
      name,
      role,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      bio
    };

    await onSaveAuthor(payload);
    setShowForm(false);
  };

  const getRoleLabel = (r) => {
    if (r === 'szerkeszto' || r === 'Szerkesztő') return 'Szerkesztő';
    if (r === 'riporter' || r === 'Riporter') return 'Riporter';
    if (r === 'fotos' || r === 'Fotós') return 'Fotós';
    return 'Szerző';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E5DFC9] p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#121215] uppercase tracking-tight">
            SZERZŐK & MUNKATÁRSAK KEZELÉSE
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[#626270] mt-0.5">
            Szerkesztők, riporterek, újságírók és fotósok profiljának szerkesztése
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="bg-[#8B1E2F] hover:bg-[#701624] text-white px-4 py-2.5 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all shadow inline-flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Új Munkatárs Hozzáadása
        </button>
      </div>

      {/* FORM MODAL / CARD */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-[#8B1E2F] p-6 rounded-xl shadow-md space-y-4 animate-fadeIn">
          <h3 className="font-serif font-bold text-lg text-[#8B1E2F] border-b border-[#E5DFC9] pb-2">
            {editingAuthor ? 'Munkatárs Szerkesztése' : 'Új Munkatárs Regisztrációja'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Munkatárs Neve *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" required />
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Fő Szerepkör *</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]">
                <option value="szerkeszto">Szerkesztő</option>
                <option value="riporter">Riporter</option>
                <option value="szerzo">Szerző / Újságíró</option>
                <option value="fotos">Fotóművész / Fotós</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Profilkép URL</label>
            <input type="text" placeholder="https://..." value={avatar} onChange={(e) => setAvatar(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" />
          </div>

          <div>
            <label className="block text-xs font-serif font-bold text-[#121215] mb-1">Rövid Bemutatkozás (Bio)</label>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full p-2 text-xs border rounded bg-[#FAF8F5]" placeholder="Rövid leírás a szerző szakterületéről..." />
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="bg-[#8B1E2F] text-white px-4 py-2 rounded text-xs font-serif font-bold">
              Mentés
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-serif text-neutral-500">
              Mégse
            </button>
          </div>
        </form>
      )}

      {/* AUTHORS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {authors.map((auth) => (
          <div key={auth.id} className="bg-white border border-[#E5DFC9] rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-start gap-4 mb-3">
              <img src={auth.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'} alt={auth.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#8B1E2F]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[#121215]">{auth.name}</h3>
                <span className="text-xs font-serif font-bold text-[#8B1E2F] bg-[#FAF2F3] px-2 py-0.5 rounded border border-[#F0D5D9] inline-block mt-1">
                  {getRoleLabel(auth.role)}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 font-sans line-clamp-3 mb-4">
              {auth.bio || 'Kőszeg és Vidéke munkatársa.'}
            </p>

            <button
              onClick={() => handleEditClick(auth)}
              className="w-full py-1.5 bg-[#FAF8F5] border border-[#D6CEBE] hover:bg-[#8B1E2F] hover:text-white text-xs font-serif font-bold rounded transition-colors inline-flex items-center justify-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Szerkesztés
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};
