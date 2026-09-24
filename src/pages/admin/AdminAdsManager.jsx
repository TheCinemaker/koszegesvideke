import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Upload, Eye, EyeOff } from 'lucide-react';
import { getAllAds, saveAd, deleteAd, isRunning } from '../../lib/ads';
import { dataService } from '../../services/dataService';

const EMPTY = {
  advertiser: '',
  title: '',
  body: '',
  image_url: '',
  link_url: '',
  phone: '',
  address: '',
  category: '',
  starts_on: new Date().toISOString().slice(0, 10),
  ends_on: '',
  active: true,
  sort_order: 0,
};

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-[14px] font-semibold text-[#1a1a1a] mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[12.5px] text-[#666] mt-1">{hint}</span>}
  </label>
);

const input = 'w-full px-3 py-2.5 text-[15px] border border-[#d6d6d6] rounded-lg bg-white focus:outline-none focus:border-[#154e87]';

// Szerkesztőségi felület: fizetett online hirdetések létrehozása, módosítása, időzítése
export const AdminAdsManager = () => {
  const [ads, setAds] = useState([]);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => getAllAds().then(setAds);
  useEffect(() => {
    reload();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await dataService.uploadImage(file, 'ad-images');
      setForm((f) => ({ ...f, image_url: url }));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.advertiser.trim() || !form.title.trim()) {
      setMsg('A hirdető neve és a hirdetés címe kötelező.');
      return;
    }
    setBusy(true);
    const payload = { ...form, ends_on: form.ends_on || null, sort_order: Number(form.sort_order) || 0 };
    const { stored } = await saveAd(payload);
    setBusy(false);
    setMsg(
      stored === 'supabase'
        ? 'Mentve, a hirdetés az online oldalon a megadott időszakban megjelenik.'
        : 'Mentve ebben a böngészőben (előnézet). A mindenki számára látható megjelenéshez a Supabase „ads” táblája szükséges (supabase_schema.sql, 10. pont) és szerkesztői bejelentkezés.'
    );
    setForm(null);
    reload();
  };

  const remove = async (ad) => {
    if (!window.confirm(`Biztosan törli: „${ad.title}” (${ad.advertiser})?`)) return;
    await deleteAd(ad.id);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold">Hirdetések</h1>
          <p className="text-[14px] text-[#555]">Fizetett online hirdetések – a nyilvános „Hirdetések” oldalon jelennek meg, a megadott időszakban.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMsg('');
            setForm({ ...EMPTY });
          }}
          className="inline-flex items-center gap-2 bg-[#154e87] hover:bg-[#0f3a66] text-white px-4 py-2.5 rounded-lg text-[15px] font-semibold"
        >
          <Plus className="w-4 h-4" /> Új hirdetés
        </button>
      </div>

      {msg && <p className="p-3 rounded-lg bg-[#eef4fa] text-[14px] text-[#0f3a66]">{msg}</p>}

      {form && (
        <form onSubmit={submit} className="bg-white border border-[#e2e2e2] rounded-2xl p-5 sm:p-6 grid gap-4 sm:grid-cols-2">
          <Field label="Hirdető neve *">
            <input className={input} value={form.advertiser} onChange={set('advertiser')} required />
          </Field>
          <Field label="Hirdetés címe *">
            <input className={input} value={form.title} onChange={set('title')} required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Szöveg" hint="Rövid leírás, 1–3 mondat.">
              <textarea className={input} rows={3} value={form.body} onChange={set('body')} />
            </Field>
          </div>
          <Field label="Kép" hint="Ajánlott: fekvő vagy négyzetes kép, legalább 1000 px széles.">
            <div className="flex items-center gap-2">
              <input className={input} value={form.image_url} onChange={set('image_url')} placeholder="https://… vagy feltöltés" />
              <label className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 border border-[#d6d6d6] rounded-lg cursor-pointer text-[14px] font-semibold">
                <Upload className="w-4 h-4" /> {busy ? '…' : 'Feltöltés'}
                <input type="file" accept="image/*" className="hidden" onChange={upload} />
              </label>
            </div>
          </Field>
          <Field label="Rovat / kategória" hint="Pl. Egészség, Szolgáltatás, Vendéglátás">
            <input className={input} value={form.category} onChange={set('category')} />
          </Field>
          <Field label="Weboldal (link)">
            <input className={input} type="url" value={form.link_url} onChange={set('link_url')} placeholder="https://" />
          </Field>
          <Field label="Telefonszám">
            <input className={input} value={form.phone} onChange={set('phone')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Cím">
              <input className={input} value={form.address} onChange={set('address')} />
            </Field>
          </div>
          <Field label="Megjelenés kezdete">
            <input className={input} type="date" value={form.starts_on} onChange={set('starts_on')} />
          </Field>
          <Field label="Megjelenés vége" hint="Üresen hagyva visszavonásig fut.">
            <input className={input} type="date" value={form.ends_on || ''} onChange={set('ends_on')} />
          </Field>
          <Field label="Sorrend" hint="Kisebb szám előrébb kerül.">
            <input className={input} type="number" value={form.sort_order} onChange={set('sort_order')} />
          </Field>
          <label className="flex items-center gap-2 text-[15px] font-semibold self-end pb-2.5">
            <input type="checkbox" checked={form.active} onChange={set('active')} className="w-5 h-5" /> Aktív
          </label>

          {form.image_url && (
            <div className="sm:col-span-2">
              <p className="text-[13px] font-semibold text-[#555] mb-1">Előnézet</p>
              <img src={form.image_url} alt="" className="max-h-64 w-auto rounded-lg border" />
            </div>
          )}

          <div className="sm:col-span-2 flex gap-2 pt-2">
            <button type="submit" disabled={busy} className="bg-[#154e87] text-white px-5 py-2.5 rounded-lg font-semibold disabled:opacity-50">
              Mentés
            </button>
            <button type="button" onClick={() => setForm(null)} className="px-5 py-2.5 rounded-lg border border-[#d6d6d6] font-semibold">
              Mégse
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#e2e2e2] rounded-2xl divide-y divide-[#eee]">
        {ads.length === 0 && <p className="p-5 text-[15px] text-[#666]">Még nincs hirdetés.</p>}
        {ads.map((ad) => {
          const running = isRunning(ad);
          return (
            <div key={ad.id} className="p-4 flex items-center gap-4">
              {ad.image_url ? (
                <img src={ad.image_url} alt="" className="w-20 h-14 object-cover rounded-md border shrink-0" />
              ) : (
                <div className="w-20 h-14 rounded-md bg-[#f2f2f2] shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[15px] truncate">{ad.title}</p>
                <p className="text-[13px] text-[#666] truncate">
                  {ad.advertiser} · {ad.starts_on || '—'} – {ad.ends_on || 'visszavonásig'}
                </p>
              </div>
              <span
                className={`hidden sm:inline-flex items-center gap-1 text-[12px] font-bold px-2 py-1 rounded-full ${
                  running ? 'bg-green-100 text-green-800' : 'bg-[#eee] text-[#666]'
                }`}
              >
                {running ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {running ? 'Fut' : 'Nem fut'}
              </span>
              <button type="button" onClick={() => setForm({ ...EMPTY, ...ad })} className="p-2 rounded-lg hover:bg-[#f2f2f2]" aria-label="Szerkesztés">
                <Pencil className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => remove(ad)} className="p-2 rounded-lg hover:bg-red-50 text-red-700" aria-label="Törlés">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
