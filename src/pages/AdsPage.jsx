import React, { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, ExternalLink, Megaphone } from 'lucide-react';
import { getRunningAds, AD_CONTACT } from '../lib/ads';

const AdCard = ({ ad }) => {
  const Wrapper = ad.link_url ? 'a' : 'div';
  const wrapperProps = ad.link_url ? { href: ad.link_url, target: '_blank', rel: 'noopener noreferrer sponsored' } : {};
  return (
    <article className="border border-[var(--color-line)] rounded-2xl overflow-hidden bg-white flex flex-col">
      <Wrapper {...wrapperProps} className="block">
        {ad.image_url && (
          <div className="bg-[#f4f4f4]">
            <img src={ad.image_url} alt={`${ad.advertiser} hirdetése`} loading="lazy" className="w-full h-auto" />
          </div>
        )}
      </Wrapper>
      <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
        {ad.category && <p className="section-label">{ad.category}</p>}
        <h2 className="headline text-[20px]">{ad.title}</h2>
        <p className="text-[15px] font-semibold text-[var(--color-ink-2)]">{ad.advertiser}</p>
        {ad.body && <p className="text-[16px] leading-relaxed text-[var(--color-ink-2)] justify">{ad.body}</p>}
        <div className="mt-auto pt-2 flex flex-wrap gap-2">
          {ad.phone && (
            <a className="btn text-[14px] py-2" href={`tel:${ad.phone.replace(/[^\d+]/g, '')}`}>
              <Phone className="w-4 h-4" aria-hidden="true" /> {ad.phone}
            </a>
          )}
          {ad.link_url && (
            <a className="btn text-[14px] py-2" href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored">
              <ExternalLink className="w-4 h-4" aria-hidden="true" /> Weboldal
            </a>
          )}
        </div>
        {ad.address && (
          <p className="meta flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /> {ad.address}
          </p>
        )}
      </div>
    </article>
  );
};

export const AdsPage = () => {
  const [ads, setAds] = useState(null);

  useEffect(() => {
    let alive = true;
    getRunningAds().then((list) => alive && setAds(list));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="container-news pt-6 sm:pt-10">
      <header className="border-b-2 border-[var(--color-ink)] pb-4 mb-8">
        <h1 className="text-[34px] sm:text-[44px] leading-tight">Hirdetések</h1>
        <p className="text-[17px] text-[var(--color-ink-2)] mt-2 max-w-[65ch] justify">
          Helyi vállalkozások, szolgáltatások és ajánlatok. A hirdetők támogatásával jelenik meg a Kőszeg és Vidéke — köszönjük!
        </p>
      </header>

      {/* Felhívás */}
      <section className="rounded-3xl bg-[var(--color-brand)] text-white p-6 sm:p-10 mb-10 overflow-hidden relative" aria-labelledby="hirdessen">
        <div className="relative max-w-[640px]">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 mb-4">
            <Megaphone className="w-6 h-6" aria-hidden="true" />
          </span>
          <h2 id="hirdessen" className="text-white text-[28px] sm:text-[36px] leading-tight">Hirdessen a Kőszeg és Vidéke online kiadásában!</h2>
          <p className="mt-3 text-[17px] sm:text-[18px] leading-relaxed text-white/90 justify">
            A nyomtatott lap 6800 példányban jut el Kőszeg és a környező települések otthonaiba. Online hirdetéssel a
            telefonon és számítógépen olvasókat is eléri — hirdetése egyértelműen jelölve, a cikkek olvasását nem zavarva jelenik meg.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href={AD_CONTACT.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[var(--color-brand)] font-bold text-[17px] px-5 py-3">
              <Phone className="w-5 h-5" aria-hidden="true" /> {AD_CONTACT.phone}
            </a>
            <a
              href={`mailto:${AD_CONTACT.email}?subject=${encodeURIComponent('Online hirdetés a Kőszeg és Vidékében')}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/70 text-white font-bold text-[17px] px-5 py-3"
            >
              <Mail className="w-5 h-5" aria-hidden="true" /> {AD_CONTACT.email}
            </a>
          </div>
          <p className="mt-3 text-[14px] text-white/80">
            {AD_CONTACT.name}, {AD_CONTACT.role}
          </p>
        </div>
      </section>

      {ads === null && <p className="text-[17px] text-[var(--color-muted)]">Hirdetések betöltése…</p>}
      {ads && ads.length === 0 && (
        <p className="text-[17px] text-[var(--color-ink-2)]">Jelenleg nincs futó online hirdetés. Legyen Ön az első!</p>
      )}
      {ads && ads.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
};
