// Service worker do app: pré-cache de todos os arquivos do build para funcionar 100% offline.
// A lista de arquivos é injetada no build pelo plugin "treino-sw" (vite.config.ts).
const manifest = [{"url":"assets/index-DzKyxPCl.js","revision":null},{"url":"assets/historico-referencia-CX-id0Cj.js","revision":null},{"url":"assets/rotinas-referencia-DGHIwNdh.js","revision":null},{"url":"assets/index-tJjNetOz.css","revision":null},{"url":"index.html","revision":"0fc1954c26"},{"url":"apple-touch-icon.png","revision":"adb048c642"},{"url":"icon-192.png","revision":"36f05d618c"},{"url":"icon-512.png","revision":"0dfef6a3b0"},{"url":"icon.svg","revision":"5482be27a6"},{"url":"manifest.webmanifest","revision":"892babc362"}]
const urls = manifest.map((e) => new URL(e.url, self.registration.scope).href)

// o nome do cache muda quando qualquer arquivo muda, forçando a atualização
let hash = 0
for (const ch of manifest.map((e) => e.url + (e.revision ?? '')).join('|')) hash = (hash * 31 + ch.charCodeAt(0)) | 0
const CACHE = `treino-${(hash >>> 0).toString(36)}`
const INDEX = new URL('index.html', self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(urls.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('treino-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = (await cache.match(req, { ignoreSearch: true })) ?? (req.mode === 'navigate' ? await cache.match(INDEX) : undefined)
      if (hit) return hit
      try {
        return await fetch(req)
      } catch (err) {
        const fallback = await cache.match(INDEX)
        if (req.mode === 'navigate' && fallback) return fallback
        throw err
      }
    }),
  )
})
