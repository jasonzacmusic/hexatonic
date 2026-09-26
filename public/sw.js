/* Hexatonic offline shell: the app keeps working when the connection drops.
 *
 * v3 (26 Sep 2026): a device that visited before must always get the newest
 * build. So:
 *   · pages are network-first and never answered from the cache while online;
 *   · the new worker takes over at once (skipWaiting + clients.claim) and
 *     deletes every older cache, including all v2 caches;
 *   · a page that fails to precache never blocks the update;
 *   · the piano samples live in their own cache, kept across builds, so an
 *     iPad does not download them again after every deploy.
 */
const PREFIX = "hexatonic-";
const BUILD = new URL(self.location.href).searchParams.get("v") || "local";
const PAGES = `${PREFIX}v3-${BUILD}`;
const AUDIO = `${PREFIX}audio-v1`;
const KEEP = [PAGES, AUDIO];
const CORE = ["/", "/practice", "/sounds", "/improvise", "/ear", "/harmony", "/learn",
              "/resolution", "/about", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(PAGES).then((c) => Promise.all(CORE.map((path) =>
      fetch(path, { cache: "reload" })
        .then((res) => (res.ok && !res.redirected ? c.put(path, res) : undefined))
        .catch(() => undefined)
    )))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(
        ks.filter((k) => (k.startsWith(PREFIX) || k.startsWith("shadava-")) && !KEEP.includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

const store = (name, request, res) => {
  if (res.ok && res.type === "basic" && !res.redirected) {
    const copy = res.clone();
    caches.open(name).then((c) => c.put(request, copy)).catch(() => {});
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Next's in-app navigation data: always straight from the network.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;
  if (url.pathname === "/sw.js") return;

  // piano samples: cache-first and keep them
  if (url.pathname.startsWith("/audio/")) {
    e.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => store(AUDIO, request, res)))
    );
    return;
  }

  // build files carry a content hash in their name, so a cached copy is exact
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => store(PAGES, request, res)))
    );
    return;
  }

  // pages and everything else: network-first; the cache is only for offline.
  // Only STORE a response that actually succeeded — caching a 404 or a 500 turns
  // one bad round-trip into the offline fallback until the next deploy.
  const page = request.mode === "navigate";
  e.respondWith(
    fetch(request)
      .then((res) => store(PAGES, request, res))
      .catch(() => caches.match(request, { ignoreSearch: page }).then((hit) =>
        hit || (page ? caches.match("/") : Response.error())))
  );
});
