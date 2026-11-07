// เก็บทุกไฟล์ไว้ในเครื่อง เปิดได้แม้ไม่มีเน็ต
// VERSION มาจาก hash ของไฟล์ทั้งหมด — แก้ไฟล์แล้วรัน `npm run stamp`
// (npm test จะล้มถ้าลืม) เครื่องผู้ใช้จึงได้ของใหม่เสมอ
const VERSION = 'prep72-1a0db134';

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/data.js',
  'js/plan.js',
  'js/progress.js',
  'js/scam.js',
  'js/store.js',
  'fonts/ibm-plex-sans-thai-thai-400-normal.woff2',
  'fonts/ibm-plex-sans-thai-thai-500-normal.woff2',
  'fonts/ibm-plex-sans-thai-latin-400-normal.woff2',
  'fonts/ibm-plex-sans-thai-latin-500-normal.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' = ข้าม HTTP cache ของเบราว์เซอร์ ไม่งั้นอาจได้ไฟล์เก่าปนไฟล์ใหม่
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // ลบเฉพาะ cache เก่าของแอปนี้ — เว็บอื่นใน <บัญชี>.github.io ใช้ origin เดียวกัน
      .then(keys => Promise.all(keys.filter(k => k.startsWith('prep72-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ไฟล์ของแอปในรูป URL เต็ม — ใช้ตัดสินว่าอะไรควรเก็บ (ไม่เก็บไฟล์อื่นใน origin เดียวกัน)
const APP_URLS = new Set(FILES.map(f => new URL(f, self.registration.scope).href));

// เติมไฟล์ที่หายจาก cache (เช่น เบราว์เซอร์ล้างเพราะพื้นที่เต็ม) ตอนที่ยังมีเน็ต
async function heal() {
  const cache = await caches.open(VERSION);
  const have = new Set((await cache.keys()).map(r => r.url));
  const missing = [...APP_URLS].filter(u => !have.has(u));
  await Promise.all(missing.map(u =>
    fetch(new Request(u, { cache: 'reload' })).then(r => (r.ok ? cache.put(u, r) : null)).catch(() => null)));
  return missing.length;
}

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'heal') e.waitUntil(heal());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  url.search = '';
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req)
        .then(res => {
          // ไฟล์ของแอปที่ไม่อยู่ใน cache: เก็บไว้ใช้ตอนออฟไลน์ครั้งหน้า
          if (res.ok && APP_URLS.has(url.href)) {
            const copy = res.clone();
            e.waitUntil(caches.open(VERSION).then(c => c.put(url.href, copy)));
          }
          return res;
        })
        .catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    }),
  );
});
