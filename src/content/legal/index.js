import impresszum from './impresszum.md?raw';
import adatvedelem from './adatvedelem.md?raw';
import sutik from './sutik.md?raw';

// Jogi oldalak: útvonal -> cím és Markdown-forrás
export const LEGAL_PAGES = {
  impresszum: { title: 'Impresszum', source: impresszum },
  adatvedelem: { title: 'Adatvédelmi tájékoztató', source: adatvedelem },
  sutik: { title: 'Süti-tájékoztató', source: sutik },
};
