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
import { useRoute, href } from './lib/router';

// A szerkesztőségi felület külön csomagban töltődik be, csak ha megnyitják.
const AdsPage = lazy(() => import('./pages/AdsPage').then((m) => ({ default: m.AdsPage })));
const AdminApp = lazy(() => import('./pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })));

const NotFound = () => (
  <div className="container-news py-20 text-center">
    <h1 className="text-[32px]">Az oldal nem található</h1>
    <p className="mt-3 text-[18px]"><a className="text-[var(--color-brand)] underline" href={href('home')}>Vissza a címlapra</a></p>
  </div>
);

export default function App() {
  const route = useRoute();

  // új oldalra lépéskor az oldal tetejére ugrunk
  const routeKey = `${route.name}/${route.param}/${route.query.q || ''}/${route.query.ev || ''}`;
  useEffect(() => {
    // új oldalra lépéskor azonnal a tetejére (a sima görgetés csak az oldalon belüli mozgásra vonatkozik)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [routeKey]);

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
    case 'kereses':
      page = <SearchPage key={`${route.query.q || ''}|${route.query.ev || ''}`} query={route.query} />;
      break;
    default:
      page = <NotFound />;
  }

  return (
    <div className="min-h-screen flex flex-col">
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
    </div>
  );
}
