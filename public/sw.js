/* Hexatonic offline shell. The live shoot cannot depend on venue wifi. */
const CACHE_PREFIX = "hexatonic-";
const BUILD = new URL(self.location.href).searchParams.get("v") || "local";
const CACHE = `${CACHE_PREFIX}${BUILD}`;
const CORE = ["/", "/practice", "/learn", "/scales", "/resolution", "/live",
              "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(
        ks.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // piano samples: cache-first and keep them forever
  if (url.pathname.startsWith("/audio/")) {
    e.respondWith(
      caches.match(request).then((hit) =>
        hit || fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
      )
    );
    return;
  }
  // everything else: network-first, fall back to cache when offline
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("/")))
  );
});
