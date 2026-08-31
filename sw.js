// Service Worker — 离线缓存 + 自动更新
const CACHE_NAME = 'chardex-v1.6';
const ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/home.css',
  './css/card-form.css',
  './css/card-view.css',
  './css/tools.css',
  './js/store.js',
  './js/ui.js',
  './js/home.js',
  './js/coc7.js',
  './js/dnd5.js',
  './js/tools.js',
  './js/app.js',
];

// 安装：缓存所有静态资源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：优先用缓存，同时后台更新
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      // 后台发起网络请求更新缓存
      const fetchPromise = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached); // 网络失败就用缓存

      return cached || fetchPromise;
    })
  );
});
