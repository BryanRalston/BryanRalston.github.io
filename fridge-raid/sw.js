const CACHE = "fridge-raid-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./assets/fridge.png",
  "./assets/apple.png",
  "./assets/banana.png",
  "./assets/berries.png",
  "./assets/carrot.png",
  "./assets/cheddar.png",
  "./assets/chips.png",
  "./assets/cookie.png",
  "./assets/expired.png",
  "./assets/grapes.png",
  "./assets/juice.png",
  "./assets/keys.png",
  "./assets/milk.png",
  "./assets/moldy.png",
  "./assets/mystery.png",
  "./assets/phone.png",
  "./assets/remote.png",
  "./assets/rotten.png",
  "./assets/sandwich.png",
  "./assets/slime.png",
  "./assets/yogurt.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const url = new URL(event.request.url);
        if (response.ok && url.pathname.includes("/assets/")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
