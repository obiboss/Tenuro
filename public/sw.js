/* BOPA PWA service worker — Phase 5 */
const CACHE_VERSION = "bopa-pwa-shell-v5";
const CACHE_PREFIX = "bopa-pwa-";
const CACHE_TIMESTAMP_HEADER =
  "x-bopa-cached-at";
const OFFLINE_URL = "/offline.html";
const OFFLINE_WORKSPACE_URL =
  "/offline-workspace.html";
const BOPA_SYNC_TAG = "bopa-offline-sync";

const MAX_CACHE_ENTRIES = 180;
const MAX_CACHE_RESPONSE_BYTES =
  5 * 1024 * 1024;
const MAX_CACHE_AGE_MS =
  30 * 24 * 60 * 60 * 1000;
const NAVIGATION_TIMEOUT_MS = 10_000;

const PRECACHE_URLS = [
  OFFLINE_URL,
  OFFLINE_WORKSPACE_URL,
  "/offline-write.css",
  "/offline-write.js",
  "/manifest.webmanifest",
  "/icons/bopa-192.png",
  "/icons/bopa-512.png",
  "/icons/bopa-maskable-512.png",
  "/apple-touch-icon.png",
];

const PRECACHE_PATHS = new Set(
  PRECACHE_URLS.map(
    (url) =>
      new URL(
        url,
        self.location.origin,
      ).pathname,
  ),
);

const SENSITIVE_PATH_PREFIXES = [
  "/api/",
  "/auth/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/manager/login",
  "/developer/login",
  "/pay/",
  "/callback",
  "/webhooks/",
  "/m/report/",
];

const CACHEABLE_CONTENT_TYPES = [
  "application/javascript",
  "text/javascript",
  "text/css",
  "font/",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "application/manifest+json",
  "application/json",
  "text/html",
];

function isSensitivePath(pathname) {
  return SENSITIVE_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

function isWorkspacePath(pathname) {
  return (
    pathname.startsWith("/manager/") ||
    pathname === "/manager" ||
    pathname.startsWith("/developer/") ||
    pathname === "/developer"
  );
}

function isStaticApplicationAsset(request, url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/apple-touch-icon.png" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script"
  );
}

function responseAllowsCaching(response) {
  if (
    !response.ok ||
    !(
      response.type === "basic" ||
      response.type === "default"
    )
  ) {
    return false;
  }

  const cacheControl =
    response.headers.get("cache-control") || "";

  if (
    /\bno-store\b/i.test(cacheControl) ||
    /\bprivate\b/i.test(cacheControl)
  ) {
    return false;
  }

  const contentType =
    response.headers.get("content-type") || "";

  return CACHEABLE_CONTENT_TYPES.some(
    (allowedType) =>
      contentType
        .toLowerCase()
        .includes(
          allowedType.toLowerCase(),
        ),
  );
}

async function createStampedResponse(response) {
  if (!responseAllowsCaching(response)) {
    return null;
  }

  const declaredLength = Number(
    response.headers.get("content-length") || "0",
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength >
      MAX_CACHE_RESPONSE_BYTES
  ) {
    return null;
  }

  const blob = await response.clone().blob();

  if (blob.size > MAX_CACHE_RESPONSE_BYTES) {
    return null;
  }

  const headers =
    new Headers(response.headers);

  headers.set(
    CACHE_TIMESTAMP_HEADER,
    String(Date.now()),
  );

  return new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isPrecachedRequest(request) {
  const url = new URL(request.url);

  return PRECACHE_PATHS.has(url.pathname);
}

function isFreshCachedResponse(
  request,
  response,
) {
  if (isPrecachedRequest(request)) {
    return true;
  }

  const timestamp = Number(
    response.headers.get(
      CACHE_TIMESTAMP_HEADER,
    ) || "0",
  );

  return (
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    Date.now() - timestamp <
      MAX_CACHE_AGE_MS
  );
}

async function pruneCurrentCache() {
  const cache = await caches.open(CACHE_VERSION);
  const requests = await cache.keys();
  const entries = [];

  for (const request of requests) {
    const response = await cache.match(request);
    const timestamp = Number(
      response?.headers.get(
        CACHE_TIMESTAMP_HEADER,
      ) || "0",
    );

    if (isPrecachedRequest(request)) {
      continue;
    }

    if (
      !response ||
      !Number.isFinite(timestamp) ||
      timestamp <= 0 ||
      Date.now() - timestamp >=
        MAX_CACHE_AGE_MS
    ) {
      await cache.delete(request);
      continue;
    }

    entries.push({
      request,
      timestamp,
    });
  }

  if (entries.length <= MAX_CACHE_ENTRIES) {
    return;
  }

  entries.sort(
    (first, second) =>
      first.timestamp - second.timestamp,
  );

  const excess =
    entries.length - MAX_CACHE_ENTRIES;

  await Promise.all(
    entries
      .slice(0, excess)
      .map((entry) =>
        cache.delete(entry.request),
      ),
  );
}

async function precacheApplicationShell() {
  const cache = await caches.open(CACHE_VERSION);

  for (const url of PRECACHE_URLS) {
    const request = new Request(url, {
      cache: "reload",
      credentials: "same-origin",
    });
    const response = await fetch(request);
    const cacheResponse =
      await createStampedResponse(response);

    if (!cacheResponse) {
      throw new Error(
        `Unable to cache required BOPA asset: ${url}`,
      );
    }

    await cache.put(request, cacheResponse);
  }

  await pruneCurrentCache();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cachedResponse =
    await cache.match(request);

  if (
    cachedResponse &&
    isFreshCachedResponse(
      request,
      cachedResponse,
    )
  ) {
    return cachedResponse;
  }

  if (cachedResponse) {
    await cache.delete(request);
  }

  const networkResponse = await fetch(request);
  const cacheResponse =
    await createStampedResponse(
      networkResponse,
    );

  if (cacheResponse) {
    await cache.put(request, cacheResponse);
    await pruneCurrentCache();
  }

  return networkResponse;
}

async function fetchWithTimeout(
  request,
  timeoutMs,
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    return await fetch(request, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function navigationNetworkFirst(
  request,
  fallbackUrl,
) {
  try {
    return await fetchWithTimeout(
      request,
      NAVIGATION_TIMEOUT_MS,
    );
  } catch {
    const cache = await caches.open(CACHE_VERSION);
    const offlineResponse =
      await cache.match(fallbackUrl);

    return (
      offlineResponse ||
      new Response(
        "BOPA is unavailable offline.",
        {
          status: 503,
          headers: {
            "Content-Type":
              "text/plain; charset=utf-8",
          },
        },
      )
    );
  }
}

async function notifyOpenClientsToSync() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage({
      type: "BOPA_SYNC_REQUESTED",
    });
  }
}

async function removeOldCaches() {
  const cacheNames = await caches.keys();

  await Promise.all(
    cacheNames
      .filter(
        (cacheName) =>
          cacheName.startsWith(
            CACHE_PREFIX,
          ) &&
          cacheName !== CACHE_VERSION,
      )
      .map((cacheName) =>
        caches.delete(cacheName),
      ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheApplicationShell(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      removeOldCaches(),
      pruneCurrentCache(),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
    return;
  }

  if (
    event.data &&
    event.data.type ===
      "GET_BOPA_WORKER_VERSION" &&
    event.source &&
    "postMessage" in event.source
  ) {
    event.source.postMessage({
      type: "BOPA_WORKER_VERSION",
      version: CACHE_VERSION,
    });
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === BOPA_SYNC_TAG) {
    event.waitUntil(
      notifyOpenClientsToSync(),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (isSensitivePath(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      navigationNetworkFirst(
        request,
        isWorkspacePath(url.pathname)
          ? OFFLINE_WORKSPACE_URL
          : OFFLINE_URL,
      ),
    );
    return;
  }

  if (isStaticApplicationAsset(request, url)) {
    event.respondWith(cacheFirst(request));
  }
});
