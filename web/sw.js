const CACHE_NAME = "athlys-shell-v61-generative-rpe";
const SHELL = [
  "/",
  "/index.html",
  "/mobile.html",
  "/mobile.webmanifest",
  "/mobile-app.css",
  "/auth-branding.css",
  "/athlys-ui.css",
  "/mobile-loader.css",
  "/manifest.webmanifest",
  "/app.css",
  "/desktop.css",
  "/ios.css",
  "/ios-install.css",
  "/athlys-neural-intent-model.js",
  "/athlys-local-intelligence.js",
  "/athlys-device-mesh.js",
  "/app.js",
  "/supabase-client.bundle.js",
  "/trial.html",
  "/trial.js",
  "/trial-status.json",
  "/athlys-external-rtc.mjs",
  "/offline-store.js",
  "/app-config.js",
  "/pwa.js",
  "/ios-install.js",
  "/assets/athlys-logo.webp",
  "/assets/athlys-logo.png",
  "/assets/athlys-logo.svg",
  "/assets/athlys-lockup.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    await cache.addAll(SHELL);

  }));
});
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("athlys-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const trustedSupabaseScript = url.href === SUPABASE_CDN;
  if (url.origin !== self.location.origin && !trustedSupabaseScript) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put("/index.html", copy));
      }
      return response;
    }).catch(() => caches.match("/index.html")));
    return;
  }
  if (["style", "script", "image", "font", "worker"].includes(request.destination)) {
    event.respondWith(caches.match(request).then(cached => {
      const fresh = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || fresh;
    }));
  }
});
