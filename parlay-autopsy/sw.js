const CACHE = "parlay-autopsy-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./autopsy.js",
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

function isScriptOrStyle(url) {
  return /\.(?:js|css)$/i.test(url.pathname);
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

async function staleWhileRevalidate(event, req, cacheKey) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(cacheKey);
  const fetched = fetch(req).then(function (res) {
    if (res && res.ok) {
      cache.put(cacheKey, res.clone()).catch(function () {});
    }
    return res;
  }).catch(function () {
    return null;
  });
  if (hit) {
    event.waitUntil(fetched);
    return hit;
  }
  const res = await fetched;
  if (res) return res;
  throw new Error("miss");
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
  if (isScriptOrStyle(url)) {
    event.respondWith(staleWhileRevalidate(event, req, cacheKey));
    return;
  }
  event.respondWith(cacheFirst(req, cacheKey));
});
