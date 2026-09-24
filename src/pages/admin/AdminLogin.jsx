import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowLeft, KeyRound } from 'lucide-react';

export const AdminLogin = ({ onLoginSuccess, onNavigatePublic }) => {
  const [email, setEmail] = useState('szerkeszto@koszegesvideke.hu');
  const [password, setPassword] = useState('admin1881');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex flex-col justify-center items-center p-4 antialiased text-[#1C1C21]">
      <button
        onClick={onNavigatePublic}
        className="mb-6 text-xs font-serif text-[#626270] hover:text-[#8B1E2F] flex items-center gap-1.5 font-bold"
      >
        <ArrowLeft className="w-4 h-4" /> Vissza a Kőszeg és Vidéke Publikus Oldalára
      </button>

      <div className="bg-white border-2 border-[#8B1E2F] rounded-2xl shadow-xl w-full max-w-md p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#8B1E2F]"></div>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#FAF2F3] text-[#8B1E2F] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#F0D5D9]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="masthead-title text-2xl font-bold uppercase tracking-tight text-[#121215]">
            KŐSZEG ÉS VIDÉKE
          </h1>
          <p className="font-serif italic text-xs text-[#626270] mt-0.5">
            Szerkesztőségi Adminisztrációs Belépés (Alapítva 1881-ben)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#121215] mb-1">
              Szerkesztőségi E-mail Cím
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 font-serif text-xs border border-[#D6CEBE] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#8B1E2F]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-serif font-bold uppercase tracking-wider text-[#121215] mb-1">
              Jelszó
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 text-xs border border-[#D6CEBE] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#8B1E2F]"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B1E2F] hover:bg-[#701624] text-white py-3 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" /> {loading ? 'Bejelentkezés...' : 'Belépés a Szerkesztőségbe'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[#ECE6D8] text-center text-[11px] font-serif text-neutral-400">
          Teszt belépéshez egyszerűen kattints a belépés gombra.
        </div>
      </div>
    </div>
  );
};
