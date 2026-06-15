const CACHE_NAME = "orakulum-v18";
const APP_FILES = [
  "./",
  "index.html",
  "styles.css?v=13",
  "app.js?v=18",
  "manifest.webmanifest",
  "icon.svg",
  "engel-karten-1000.json",
  "liebe-karten-1000.json",
  "beruf-karten-1000.json",
  "gesundheit-karten-1000.json",
  "geografie-karten-1000.json",
  "finanzen-karten-1000.json",
  "psychologie-karten-1000.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./", copy));
          return response;
        })
        .catch(() => caches.match("./")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }),
    ),
  );
});
