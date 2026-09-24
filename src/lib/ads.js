// Online hirdetések: Supabase „ads” tábla (supabase_schema.sql 10. pont).
// Ha a Supabase nem érhető el, a src/data/ads.json statikus lista és a böngészőben (admin előnézet) tárolt
// hirdetések jelennek meg.
import STATIC_ADS from '../data/ads.json';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const LOCAL_KEY = 'koszeg_ads_v1';

// A lap impresszumában szereplő hirdetésszervezési elérhetőség
export const AD_CONTACT = {
  name: 'Kámán Zoltán',
  role: 'hirdetésszervezés',
  phone: '06 20 381 8014',
  phoneHref: 'tel:+36203818014',
  email: 'kamansn@t-online.hu',
};

const today = () => new Date().toISOString().slice(0, 10);

export const isRunning = (ad, day = today()) =>
  ad.active !== false && (!ad.starts_on || ad.starts_on <= day) && (!ad.ends_on || ad.ends_on >= day);

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    // a böngésző tiltja a tárolást – ilyenkor csak a munkamenet idejére marad meg
  }
}

const sortAds = (list) => [...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (b.created_at || '').localeCompare(a.created_at || ''));

// Minden hirdetés (admin nézethez), futó és lejárt is
export async function getAllAds() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('ads').select('*');
      if (!error && data) return sortAds([...data, ...readLocal()]);
    } catch (err) {
      console.warn('Hirdetések betöltése a Supabase-ből nem sikerült:', err);
    }
  }
  return sortAds([...STATIC_ADS, ...readLocal()]);
}

// A nyilvános oldalon csak a futó hirdetések
export async function getRunningAds() {
  return (await getAllAds()).filter((a) => isRunning(a));
}

export async function saveAd(ad) {
  const now = new Date().toISOString();
  const payload = { ...ad, updated_at: now, created_at: ad.created_at || now };
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('ads').upsert(payload).select().single();
      if (!error && data) return { ad: data, stored: 'supabase' };
      console.warn('Supabase mentés sikertelen:', error);
    } catch (err) {
      console.warn('Supabase mentés sikertelen:', err);
    }
  }
  const local = readLocal();
  const withId = { ...payload, id: payload.id || `local-${Date.now()}` };
  const idx = local.findIndex((a) => a.id === withId.id);
  if (idx >= 0) local[idx] = withId;
  else local.unshift(withId);
  writeLocal(local);
  return { ad: withId, stored: 'local' };
}

export async function deleteAd(id) {
  if (isSupabaseConfigured() && !String(id).startsWith('local-')) {
    try {
      await supabase.from('ads').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase törlés sikertelen:', err);
    }
  }
  writeLocal(readLocal().filter((a) => a.id !== id));
}
