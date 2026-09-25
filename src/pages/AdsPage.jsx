import React, { useEffect, useState } from 'react';
import { Phone, Mail, Megaphone } from 'lucide-react';
import { getRunningAds, AD_CONTACT } from '../lib/ads';
import PRINT_ADS from '../data/printAds.json';

// Online (adminból feltett) hirdetés: csak a kép, linkkel ha van
const AdImage = ({ ad }) => {
  if (!ad.image_url) return null;
  const img = (
    <img
      src={ad.image_url}
      alt={`Hirdetés – ${ad.advertiser}`}
      loading="lazy"
      decoding="async"
      className="w-full h-auto rounded-lg shadow-sm border border-[var(--color-line)]"
    />
  );
  return ad.link_url ? (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored" className="block">
      {img}
    </a>
  ) : (
    img
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
      </header>

      {/* A legfrissebb lapszám hirdetései – csak a képek, egymás alatt */}
      <div className="max-w-[760px] mx-auto flex flex-col gap-6 sm:gap-8">
        {PRINT_ADS.ads.map((ad) => (
          <img
            key={ad.src}
            src={ad.src}
            width={ad.w}
            height={ad.h}
            alt="Hirdetés"
            loading="lazy"
            decoding="async"
            className="w-full h-auto rounded-lg shadow-sm border border-[var(--color-line)]"
          />
        ))}
      </div>


      {ads && ads.length > 0 && (
        <div className="max-w-[760px] mx-auto flex flex-col gap-6 sm:gap-8 mt-6 sm:mt-8">
          {ads.map((ad) => (
            <AdImage key={ad.id} ad={ad} />
          ))}
        </div>
      )}
      {/* Felhívás */}
      <section className="rounded-3xl bg-[var(--color-brand)] text-white p-6 sm:p-10 mt-12 overflow-hidden relative" aria-labelledby="hirdessen">
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
    </div>
  );
};
