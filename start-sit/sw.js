const CACHE = "start-sit-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./verdict.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

function pathKey(url) {
  return new Request(url.origin + url.pathname);
}

function isHtml(req) {
  if (req.mode === "navigate") return true;
  const accept = req.headers.get("accept") || "";
  return accept.indexOf("text/html") !== -1;
}

async function networkFirst(req, cacheKey) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      try {
        await cache.put(cacheKey, res.clone());
      } catch (_) {
        /* quota or an uncacheable response should not block the page */
      }
    }
    return res;
  } catch (_) {
    const hit = (await cache.match(cacheKey)) || (await cache.match("./index.html"));
    if (hit) return hit;
    throw _;
  }
}

async function cacheFirst(req, cacheKey) {
  const hit = await caches.match(cacheKey);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((cache) => cache.put(cacheKey, copy)).catch(function () {});
  }
  return res;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(cacheFirst(req, req));
    return;
  }
  const cacheKey = pathKey(url);
  if (isHtml(req)) {
    event.respondWith(networkFirst(req, cacheKey));
    return;
  }
  event.respondWith(cacheFirst(req, cacheKey));
});
