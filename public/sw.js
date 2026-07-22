const CACHE_VERSION = "bopa-integrated-offline-v2";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const PAGE_CACHE = `${CACHE_VERSION}:pages`;
const RSC_CACHE = `${CACHE_VERSION}:rsc`;
const CACHE_PREFIXES = [
  "bopa-shell-",
  "bopa-integrated-offline-",
];

const APP_SHELL = [
  "/manifest.webmanifest",
  "/icons/bopa-icon.svg",
];

const ONLINE_ONLY_PATH_PREFIXES = [
  "/api/",
  "/manager/reports",
  "/manager/documents",
  "/manager/agreements",
  "/manager/receipts",
  "/manager/paystack",
  "/manager/bank",
  "/manager/verification",
  "/auth/",
  "/login",
  "/logout",
  "/reset-password",
  "/forgot-password",
];

function isOnlineOnlyPath(pathname) {
  if (
    pathname.includes("/download") ||
    pathname.includes("/documents") ||
    pathname.includes("/paystack") ||
    pathname.includes("/bank-verification") ||
    pathname.endsWith(".pdf")
  ) {
    return true;
  }

  return ONLINE_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:css|js|woff2?|png|jpe?g|webp|svg|ico)$/i.test(url.pathname)
  );
}

function isRscRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

function createCacheKey(url, kind, keepSearch) {
  const normalized = new URL(url.origin);
  normalized.pathname = `/__bopa_offline_cache__/${kind}${url.pathname}`;

  if (keepSearch) {
    const params = new URLSearchParams(url.searchParams);
    params.delete("_rsc");
    params.sort();
    const query = params.toString();
    normalized.search = query ? `?${query}` : "";
  }

  return new Request(normalized.toString(), { method: "GET" });
}

async function safelyCache(cacheName, key, response) {
  if (!response || !response.ok || response.type === "opaque") {
    return;
  }

  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, response.clone());
  } catch {
    // The online response remains authoritative when browser cache is unavailable.
  }
}

async function findCachedResponse(cacheName, keys) {
  const cache = await caches.open(cacheName);

  for (const key of keys) {
    const response = await cache.match(key, { ignoreVary: true });

    if (response) {
      return response;
    }
  }

  return null;
}

function getNormalWorkspaceFallbacks(url, kind) {
  if (url.pathname.startsWith("/manager/")) {
    return [
      createCacheKey(new URL("/manager/overview", url.origin), kind, false),
      createCacheKey(new URL("/manager/properties", url.origin), kind, false),
    ];
  }

  if (url.pathname.startsWith("/developer/")) {
    return [
      createCacheKey(new URL("/developer/overview", url.origin), kind, false),
    ];
  }

  if (
    url.pathname.startsWith("/overview") ||
    url.pathname.startsWith("/properties") ||
    url.pathname.startsWith("/tenants") ||
    url.pathname.startsWith("/payments")
  ) {
    return [createCacheKey(new URL("/overview", url.origin), kind, false)];
  }

  return [];
}

function offlineUnavailableResponse() {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#1b4fd8" />
  <title>BOPA is offline</title>
  <style>
    body{margin:0;background:#f8f7f4;color:#172033;font-family:Inter,system-ui,sans-serif}
    main{max-width:520px;margin:12vh auto;padding:24px}
    section{border:1px solid #e4e7ec;border-radius:18px;background:white;padding:24px;box-shadow:0 8px 24px rgba(16,24,40,.06)}
    h1{margin:0;font-size:24px}p{color:#667085;line-height:1.6}
    button{min-height:44px;border:0;border-radius:12px;background:#1b4fd8;color:white;padding:0 18px;font-weight:800;cursor:pointer}
  </style>
</head>
<body>
  <main><section>
    <h1>This BOPA page is not available offline yet</h1>
    <p>Return to a Manager page that was opened while online. Your saved records remain on this device and will sync automatically.</p>
    <button type="button" onclick="history.back()">Go back</button>
  </section></main>
</body>
</html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  await safelyCache(STATIC_CACHE, request, response);
  return response;
}

async function handleNormalNavigation(request, url) {
  const exactKey = createCacheKey(url, "page", true);
  const routeKey = createCacheKey(url, "page", false);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await Promise.all([
        safelyCache(PAGE_CACHE, exactKey, response),
        safelyCache(PAGE_CACHE, routeKey, response),
      ]);
    }

    return response;
  } catch {
    const cached = await findCachedResponse(PAGE_CACHE, [
      exactKey,
      routeKey,
      ...getNormalWorkspaceFallbacks(url, "page"),
    ]);

    return cached ?? offlineUnavailableResponse();
  }
}

async function handleRscRequest(request, url) {
  const exactKey = createCacheKey(url, "rsc", true);
  const routeKey = createCacheKey(url, "rsc", false);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await Promise.all([
        safelyCache(RSC_CACHE, exactKey, response),
        safelyCache(RSC_CACHE, routeKey, response),
      ]);
    }

    return response;
  } catch {
    const cached = await findCachedResponse(RSC_CACHE, [
      exactKey,
      routeKey,
      ...getNormalWorkspaceFallbacks(url, "rsc"),
    ]);

    if (cached) {
      return cached;
    }

    return new Response("", {
      status: 503,
      headers: {
        "Content-Type": "text/x-component",
        "Cache-Control": "no-store",
      },
    });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  );
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
                !key.startsWith(CACHE_VERSION),
            )
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

  if (isOnlineOnlyPath(url.pathname)) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNormalNavigation(request, url));
    return;
  }

  if (isRscRequest(request, url)) {
    event.respondWith(handleRscRequest(request, url));
  }
});


async function primeOfflineRoutes(routes) {
  if (!Array.isArray(routes)) {
    return;
  }

  for (const route of routes.slice(0, 12)) {
    if (typeof route !== "string" || !route.startsWith("/")) {
      continue;
    }

    const url = new URL(route, self.location.origin);

    if (isOnlineOnlyPath(url.pathname)) {
      continue;
    }

    try {
      const response = await fetch(url.toString(), {
        credentials: "include",
        headers: { Accept: "text/html" },
      });

      if (response.ok) {
        await Promise.all([
          safelyCache(
            PAGE_CACHE,
            createCacheKey(url, "page", true),
            response,
          ),
          safelyCache(
            PAGE_CACHE,
            createCacheKey(url, "page", false),
            response,
          ),
        ]);
      }
    } catch {
      // Existing cached routes remain available when priming is interrupted.
    }
  }
}

async function notifyClients() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

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

  if (event.data && event.data.type === "BOPA_PRIME_OFFLINE_ROUTES") {
    event.waitUntil(primeOfflineRoutes(event.data.routes));
  }

  if (event.data && event.data.type === "BOPA_CLEAR_OFFLINE_PAGE_CACHE") {
    event.waitUntil(
      Promise.all([
        caches.delete(PAGE_CACHE),
        caches.delete(RSC_CACHE),
      ]),
    );
  }
});
