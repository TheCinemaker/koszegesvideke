import React from 'react';
import { LayoutDashboard, FileText, PlusCircle, BookOpen, Users, LogOut, Globe, ShieldCheck, Megaphone } from 'lucide-react';

export const AdminLayout = ({ activeTab, setActiveTab, onNavigatePublic, onLogout, children }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'articles', label: 'Cikkek', icon: FileText },
    { id: 'new-article', label: 'Új cikk', icon: PlusCircle },
    { id: 'issues', label: 'Lapszámok', icon: BookOpen },
    { id: 'authors', label: 'Szerzők', icon: Users },
    { id: 'ads', label: 'Hirdetések', icon: Megaphone }
  ];

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex flex-col md:flex-row antialiased text-[#1C1C21]">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#1C1C21] text-white flex-shrink-0 border-r border-amber-900/20 flex flex-col justify-between">
        <div>
          {/* Admin Header Brand */}
          <div className="p-6 border-b border-neutral-800">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-[#8B1E2F]" />
              <span className="text-[11px] font-serif uppercase tracking-widest text-[#C59B27] font-bold">MINI-CRM ADMIN</span>
            </div>
            <h2 className="masthead-title text-xl font-bold tracking-tight text-white uppercase">
              KŐSZEG ÉS VIDÉKE
            </h2>
            <span className="text-[11px] font-serif text-neutral-400 block mt-0.5">Szerkesztőségi Rendszer</span>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-serif font-semibold transition-all ${
                    isActive
                      ? 'bg-[#8B1E2F] text-white shadow'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#C59B27]'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-neutral-800 space-y-2">
          <button
            onClick={onNavigatePublic}
            className="w-full flex items-center gap-2 px-4 py-2 rounded text-xs font-serif font-semibold text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4 text-neutral-400" />
            Vissza a Publikus Oldalra
          </button>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded text-xs font-serif font-semibold text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Kijelentkezés
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>

    </div>
  );
};
