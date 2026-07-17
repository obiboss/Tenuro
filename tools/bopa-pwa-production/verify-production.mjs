import path from "node:path";
import {
  addCheck,
  cacheControlIsNoStore,
  cacheControlIsSafeForWorker,
  contentTypeIncludes,
  createReport,
  fetchWithTimeout,
  getArgument,
  normalizeBaseUrl,
  printReport,
  readPngDimensionsFromBuffer,
  writeReportFiles,
} from "./pwa-check-lib.mjs";

const args = process.argv.slice(2);
const rawUrl =
  getArgument(args, "--url");

if (!rawUrl) {
  console.error(
    "Usage: node verify-production.mjs --url https://boldverseproperty.com",
  );
  process.exit(2);
}

let baseUrl;

try {
  baseUrl =
    normalizeBaseUrl(rawUrl);
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Invalid production URL.",
  );
  process.exit(2);
}

const outputDirectory = path.resolve(
  getArgument(args, "--output") ??
    path.join(
      process.cwd(),
      "artifacts",
      "pwa-production",
    ),
);

const report = createReport({
  title:
    "BOPA PWA deployed production verification",
  target: baseUrl.href,
});

function productionUrl(relativePath) {
  return new URL(
    relativePath,
    baseUrl,
  );
}

async function checkPublicAsset({
  id,
  name,
  relativePath,
  expectedContentType,
}) {
  try {
    const response =
      await fetchWithTimeout(
        productionUrl(relativePath),
        {
          method: "GET",
          headers: {
            Accept: "*/*",
          },
        },
      );
    const passed =
      response.status === 200 &&
      (
        !expectedContentType ||
        contentTypeIncludes(
          response,
          expectedContentType,
        )
      );

    addCheck(report, {
      id,
      name,
      passed,
      details:
        `Status ${response.status}; content-type ${response.headers.get("content-type") ?? "missing"}.`,
    });

    return response;
  } catch (error) {
    addCheck(report, {
      id,
      name,
      passed: false,
      details:
        error instanceof Error
          ? error.message
          : "Request failed.",
    });

    return null;
  }
}

let homepageHtml = "";

try {
  const response =
    await fetchWithTimeout(
      baseUrl,
      {
        method: "GET",
        headers: {
          Accept: "text/html",
        },
      },
    );

  homepageHtml =
    await response.text();

  addCheck(report, {
    id: "production:https-home",
    name:
      "Production homepage is available over HTTPS",
    passed:
      response.status === 200 &&
      contentTypeIncludes(
        response,
        "text/html",
      ),
    details:
      `Final URL ${response.url}; status ${response.status}.`,
  });

  addCheck(report, {
    id:
      "production:manifest-link",
    name:
      "Homepage links the web app manifest",
    passed:
      /<link[^>]+rel=["'][^"']*\bmanifest\b[^"']*["'][^>]+href=["'][^"']*manifest\.webmanifest[^"']*["']/i.test(
        homepageHtml,
      ) ||
      /<link[^>]+href=["'][^"']*manifest\.webmanifest[^"']*["'][^>]+rel=["'][^"']*\bmanifest\b[^"']*["']/i.test(
        homepageHtml,
      ),
    details:
      "Checked rendered homepage HTML.",
  });

  addCheck(report, {
    id:
      "production:apple-touch-icon",
    name:
      "Homepage exposes an Apple touch icon",
    passed:
      /apple-touch-icon/i.test(
        homepageHtml,
      ),
    severity: "warning",
    details:
      "Checked rendered homepage HTML.",
  });
} catch (error) {
  addCheck(report, {
    id: "production:https-home",
    name:
      "Production homepage is available over HTTPS",
    passed: false,
    details:
      error instanceof Error
        ? error.message
        : "Homepage request failed.",
  });
}

const manifestResponse =
  await checkPublicAsset({
    id: "production:manifest",
    name:
      "Web app manifest is publicly available",
    relativePath:
      "/manifest.webmanifest",
    expectedContentType: "json",
  });

let manifest = null;

if (manifestResponse?.ok) {
  try {
    manifest =
      await manifestResponse.json();

    const icons =
      Array.isArray(manifest.icons)
        ? manifest.icons
        : [];
    const has192 =
      icons.some(
        (icon) =>
          icon?.sizes ===
            "192x192" &&
          typeof icon?.src === "string",
      );
    const has512 =
      icons.some(
        (icon) =>
          icon?.sizes ===
            "512x512" &&
          typeof icon?.src === "string",
      );
    const hasMaskable =
      icons.some(
        (icon) =>
          typeof icon?.purpose ===
            "string" &&
          icon.purpose
            .split(/\s+/)
            .includes("maskable"),
      );

    addCheck(report, {
      id:
        "production:manifest-fields",
      name:
        "Manifest contains installability metadata",
      passed:
        typeof manifest.name ===
          "string" &&
        typeof manifest.short_name ===
          "string" &&
        manifest.start_url === "/" &&
        manifest.scope === "/" &&
        manifest.display ===
          "standalone" &&
        typeof manifest.theme_color ===
          "string" &&
        typeof manifest.background_color ===
          "string" &&
        has192 &&
        has512 &&
        hasMaskable,
      details:
        "Checked name, short name, start URL, scope, display, colors, and icons.",
    });
  } catch (error) {
    addCheck(report, {
      id:
        "production:manifest-fields",
      name:
        "Manifest contains installability metadata",
      passed: false,
      details:
        error instanceof Error
          ? error.message
          : "Manifest JSON could not be parsed.",
    });
  }
}

const serviceWorkerResponse =
  await checkPublicAsset({
    id:
      "production:service-worker",
    name:
      "Service worker is publicly available",
    relativePath: "/sw.js",
    expectedContentType:
      "javascript",
  });

if (serviceWorkerResponse) {
  const workerCacheControl =
    serviceWorkerResponse.headers.get(
      "cache-control",
    );

  addCheck(report, {
    id:
      "production:worker-cache",
    name:
      "Service worker is not immutable or long-lived",
    passed:
      cacheControlIsSafeForWorker(
        workerCacheControl,
      ),
    details:
      `Cache-Control: ${workerCacheControl ?? "missing"}.`,
  });

  const workerText =
    await serviceWorkerResponse.text();

  addCheck(report, {
    id:
      "production:worker-policy",
    name:
      "Deployed worker contains the Phase 5 security policy",
    passed:
      /bopa-pwa-shell-v5/.test(
        workerText,
      ) &&
      /MAX_CACHE_ENTRIES\s*=\s*180/.test(
        workerText,
      ) &&
      /["']\/api\/["']/.test(
        workerText,
      ) &&
      /offline-workspace\.html/.test(
        workerText,
      ),
    details:
      "Checked deployed service-worker source.",
  });
}

await checkPublicAsset({
  id: "production:offline-public",
  name:
    "Public offline fallback is available",
  relativePath: "/offline.html",
  expectedContentType: "text/html",
});

await checkPublicAsset({
  id:
    "production:offline-workspace",
  name:
    "Workspace offline fallback is available",
  relativePath:
    "/offline-workspace.html",
  expectedContentType: "text/html",
});

await checkPublicAsset({
  id:
    "production:offline-style",
  name:
    "Offline workspace styles are available",
  relativePath: "/offline-write.css",
  expectedContentType: "text/css",
});

await checkPublicAsset({
  id:
    "production:offline-script",
  name:
    "Offline workspace write script is available",
  relativePath: "/offline-write.js",
  expectedContentType:
    "javascript",
});

const iconChecks = [
  {
    path:
      "/icons/bopa-192.png",
    width: 192,
    height: 192,
  },
  {
    path:
      "/icons/bopa-512.png",
    width: 512,
    height: 512,
  },
  {
    path:
      "/icons/bopa-maskable-512.png",
    width: 512,
    height: 512,
  },
  {
    path:
      "/apple-touch-icon.png",
    width: null,
    height: null,
  },
];

for (const icon of iconChecks) {
  try {
    const response =
      await fetchWithTimeout(
        productionUrl(icon.path),
      );
    const buffer = Buffer.from(
      await response.arrayBuffer(),
    );
    const dimensions =
      readPngDimensionsFromBuffer(
        buffer,
      );
    const matchesExpected =
      icon.width === null ||
      (
        dimensions.width ===
          icon.width &&
        dimensions.height ===
          icon.height
      );

    addCheck(report, {
      id:
        `production:icon:${icon.path}`,
      name:
        `Production icon: ${icon.path}`,
      passed:
        response.status === 200 &&
        contentTypeIncludes(
          response,
          "image/png",
        ) &&
        matchesExpected,
      details:
        `Status ${response.status}; ${dimensions.width}×${dimensions.height}.`,
    });
  } catch (error) {
    addCheck(report, {
      id:
        `production:icon:${icon.path}`,
      name:
        `Production icon: ${icon.path}`,
      passed: false,
      details:
        error instanceof Error
          ? error.message
          : "Icon request failed.",
    });
  }
}

try {
  const response =
    await fetchWithTimeout(
      productionUrl(
        "/api/offline/read",
      ),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

  addCheck(report, {
    id:
      "production:read-auth-boundary",
    name:
      "Offline read endpoint rejects unauthenticated access",
    passed:
      response.status === 401 ||
      response.status === 403,
    details:
      `Status ${response.status}.`,
  });

  addCheck(report, {
    id:
      "production:read-no-store",
    name:
      "Offline read endpoint is non-cacheable",
    passed:
      cacheControlIsNoStore(
        response.headers.get(
          "cache-control",
        ),
      ),
    details:
      `Cache-Control: ${response.headers.get("cache-control") ?? "missing"}.`,
  });
} catch (error) {
  addCheck(report, {
    id:
      "production:read-auth-boundary",
    name:
      "Offline read endpoint rejects unauthenticated access",
    passed: false,
    details:
      error instanceof Error
        ? error.message
        : "Request failed.",
  });
}

try {
  const response =
    await fetchWithTimeout(
      productionUrl(
        "/api/offline/push",
      ),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          mutations: [],
        }),
      },
    );

  addCheck(report, {
    id:
      "production:push-invalid",
    name:
      "Offline push endpoint rejects an empty mutation batch",
    passed:
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403,
    details:
      `Status ${response.status}.`,
  });

  addCheck(report, {
    id:
      "production:push-no-store",
    name:
      "Offline push endpoint is non-cacheable",
    passed:
      cacheControlIsNoStore(
        response.headers.get(
          "cache-control",
        ),
      ),
    details:
      `Cache-Control: ${response.headers.get("cache-control") ?? "missing"}.`,
  });
} catch (error) {
  addCheck(report, {
    id:
      "production:push-invalid",
    name:
      "Offline push endpoint rejects an empty mutation batch",
    passed: false,
    details:
      error instanceof Error
        ? error.message
        : "Request failed.",
  });
}

const {
  jsonPath,
  markdownPath,
} = await writeReportFiles(
  report,
  outputDirectory,
  "pwa-production-verification",
);

printReport(report);
console.log("");
console.log(
  `JSON report: ${jsonPath}`,
);
console.log(
  `Markdown report: ${markdownPath}`,
);

process.exitCode =
  report.passed ? 0 : 1;
