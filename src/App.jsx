import React, { Suspense, lazy, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileNav } from './components/MobileNav';
import { HomePage } from './pages/HomePage';
import { ArticlePage } from './pages/ArticlePage';
import { CategoryPage } from './pages/CategoryPage';
import { IssuePage } from './pages/IssuePage';
import { ArchivePage } from './pages/ArchivePage';
import { SearchPage } from './pages/SearchPage';
import { LegalPage } from './pages/LegalPage';
import { LEGAL_PAGES } from './content/legal';
import { useRoute, href } from './lib/router';
import { useDocumentMeta } from './lib/useDocumentMeta';

// A szerkesztőségi felület külön csomagban töltődik be, csak ha megnyitják.
const AdsPage = lazy(() => import('./pages/AdsPage').then((m) => ({ default: m.AdsPage })));
const PhotoReviewPage = lazy(() => import('./pages/PhotoReviewPage').then((m) => ({ default: m.PhotoReviewPage })));
const AdminApp = lazy(() => import('./pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })));

const NotFound = () => (
  <div className="container-news py-20 text-center">
    <h1 className="text-[32px]">Az oldal nem található</h1>
    <p className="mt-3 text-[18px]"><a className="text-[var(--color-brand)] underline" href={href('home')}>Vissza a címlapra</a></p>
  </div>
);

import { ScrollToTop } from './components/ScrollToTop';
import { PdfModal } from './components/PdfModal';

export default function App() {
  const route = useRoute();
  useDocumentMeta(route);
  const [pdfModal, setPdfModal] = React.useState(null);

  // új oldalra lépéskor az oldal tetejére ugrunk
  const routeKey = `${route.name}/${route.param}/${route.query.q || ''}/${route.query.ev || ''}`;
  useEffect(() => {
    // új oldalra lépéskor azonnal a tetejére (a sima görgetés csak az oldalon belüli mozgásra vonatkozik)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [routeKey]);

  // Globális PDF kattintás-elfogó és egyedi esemény-figyelő (Modalban nyitja meg a PDF lapszámot)
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const hrefAttr = a.getAttribute('href');
      if (hrefAttr && (hrefAttr.includes('.pdf') || hrefAttr.includes('r2.dev') || hrefAttr.includes('r2.cloudflarestorage.com'))) {
        e.preventDefault();
        const title = a.getAttribute('data-pdf-title') || a.getAttribute('aria-label') || a.getAttribute('alt') || 'Kőszeg és Vidéke PDF Lapszám';
        setPdfModal({ url: hrefAttr, title });
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail?.url) {
        setPdfModal({ url: e.detail.url, title: e.detail.title || 'Kőszeg és Vidéke PDF Lapszám' });
      }
    };

    window.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('open-pdf-modal', handleCustomEvent);
    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('open-pdf-modal', handleCustomEvent);
    };
  }, []);

  if (route.name === 'admin') {
    return (
      <Suspense fallback={<p className="p-8 text-[18px]">Betöltés…</p>}>
        <AdminApp />
      </Suspense>
    );
  }

  let page;
  switch (route.name) {
    case 'home':
      page = <HomePage />;
      break;
    case 'cikk':
      page = <ArticlePage key={route.param} id={route.param} />;
      break;
    case 'rovat':
      page = <CategoryPage slug={route.param} />;
      break;
    case 'lapszam':
      page = <IssuePage id={route.param} />;
      break;
    case 'archivum':
      page = <ArchivePage year={route.param} />;
      break;
    case 'hirdetesek':
      page = (
        <Suspense fallback={<p className="container-news py-10 text-[18px]">Betöltés…</p>}>
          <AdsPage />
        </Suspense>
      );
      break;
    case 'kepellenorzes':
      page = (
        <Suspense fallback={<p className="container-news py-10 text-[18px]">Betöltés…</p>}>
          <PhotoReviewPage />
        </Suspense>
      );
      break;
    case 'kereses':
      page = <SearchPage key={`${route.query.q || ''}|${route.query.ev || ''}`} query={route.query} />;
      break;
    default:
      page = LEGAL_PAGES[route.name] ? <LegalPage page={route.name} /> : <NotFound />;
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <button
        type="button"
        onClick={() => document.getElementById('main')?.focus()}
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-white"
      >
        Ugrás a tartalomra
      </button>
      <Header route={route} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{page}</main>
      <Footer />
      <MobileNav key={routeKey} route={route} />
      <ScrollToTop />
      {pdfModal && (
        <PdfModal
          pdfUrl={pdfModal.url}
          title={pdfModal.title}
          onClose={() => setPdfModal(null)}
        />
      )}
    </div>
  );
}
