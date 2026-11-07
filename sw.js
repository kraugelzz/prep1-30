// เก็บทุกไฟล์ไว้ในเครื่อง เปิดได้แม้ไม่มีเน็ต
// VERSION มาจาก hash ของไฟล์ทั้งหมด — แก้ไฟล์แล้วรัน `npm run stamp`
// (npm test จะล้มถ้าลืม) เครื่องผู้ใช้จึงได้ของใหม่เสมอ
const VERSION = 'prep72-cdccbd55';

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/data.js',
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
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).catch(() =>
        req.mode === 'navigate' ? caches.match('index.html') : Response.error(),
      );
    }),
  );
});
