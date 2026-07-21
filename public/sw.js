const CACHE_VERSION = "bopa-shell-v1";
const APP_SHELL = [
  "/offline-workspace.html",
  "/manifest.webmanifest",
  "/icons/bopa-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("bopa-shell-") && key !== CACHE_VERSION)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline-workspace.html", { ignoreSearch: true }),
      ),
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline-workspace.html";

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

async function notifyClients() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: "BOPA_SYNC_REQUESTED" });
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "bopa-offline-sync") {
    event.waitUntil(notifyClients());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }

  if (event.data && event.data.type === "BOPA_REQUEST_SYNC") {
    event.waitUntil(notifyClients());
  }
});
