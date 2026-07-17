import fs from "node:fs/promises";
import path from "node:path";
import {
  addCheck,
  createReport,
  fileExists,
  getArgument,
  printReport,
  readPngDimensions,
  readText,
  safePath,
  writeReportFiles,
} from "./pwa-check-lib.mjs";

const args = process.argv.slice(2);
const projectRoot = path.resolve(
  getArgument(args, "--project") ??
    process.cwd(),
);
const outputDirectory = path.resolve(
  getArgument(args, "--output") ??
    path.join(
      projectRoot,
      "artifacts",
      "pwa-production",
    ),
);

const report = createReport({
  title:
    "BOPA PWA static production readiness",
  target: projectRoot,
});

const requiredFiles = [
  "package.json",
  "src/app/manifest.ts",
  "src/components/pwa/pwa-runtime.tsx",
  "src/lib/offline/database.ts",
  "src/lib/offline/read-sync.client.ts",
  "src/lib/offline/push-sync.client.ts",
  "src/server/offline/read-snapshot.service.ts",
  "src/server/offline/safe-mutation.service.ts",
  "src/app/api/offline/read/route.ts",
  "src/app/api/offline/push/route.ts",
  "public/sw.js",
  "public/offline.html",
  "public/offline-workspace.html",
  "public/offline-write.css",
  "public/offline-write.js",
  "public/icons/bopa-192.png",
  "public/icons/bopa-512.png",
  "public/icons/bopa-maskable-512.png",
  "public/apple-touch-icon.png",
  "supabase/migrations/20260717000000_offline_safe_mutations.sql",
  "supabase/migrations/20260717010000_offline_sync_hardening.sql",
  "docs/PWA_OFFLINE_SECURITY.md",
];

for (const relativePath of requiredFiles) {
  const exists = await fileExists(
    safePath(
      projectRoot,
      relativePath,
    ),
  );

  addCheck(report, {
    id:
      `required:${relativePath}`,
    name:
      `Required file: ${relativePath}`,
    passed: exists,
    details: exists
      ? "Present."
      : "Missing.",
  });
}

async function readProjectFile(
  relativePath,
) {
  return readText(
    safePath(
      projectRoot,
      relativePath,
    ),
  );
}

if (
  await fileExists(
    safePath(
      projectRoot,
      "src/app/manifest.ts",
    ),
  )
) {
  const manifestSource =
    await readProjectFile(
      "src/app/manifest.ts",
    );

  const manifestChecks = [
    [
      "manifest:name",
      "Manifest includes full and short names",
      /\bname\s*:\s*APP_NAME/.test(
        manifestSource,
      ) &&
        /\bshort_name\s*:\s*["']BOPA["']/.test(
          manifestSource,
        ),
    ],
    [
      "manifest:description",
      "Manifest includes a description",
      /\bdescription\s*:\s*APP_DESCRIPTION/.test(
        manifestSource,
      ),
    ],
    [
      "manifest:start",
      "Manifest start URL and scope are root-scoped",
      /\bstart_url\s*:\s*["']\/["']/.test(
        manifestSource,
      ) &&
        /\bscope\s*:\s*["']\/["']/.test(
          manifestSource,
        ),
    ],
    [
      "manifest:display",
      "Manifest launches in standalone display mode",
      /\bdisplay\s*:\s*["']standalone["']/.test(
        manifestSource,
      ),
    ],
    [
      "manifest:colors",
      "Manifest includes branded background and theme colors",
      /\bbackground_color\s*:/.test(
        manifestSource,
      ) &&
        /\btheme_color\s*:/.test(
          manifestSource,
        ),
    ],
    [
      "manifest:icons",
      "Manifest includes 192px, 512px, and maskable icons",
      /bopa-192\.png/.test(
        manifestSource,
      ) &&
        /bopa-512\.png/.test(
          manifestSource,
        ) &&
        /bopa-maskable-512\.png/.test(
          manifestSource,
        ) &&
        /purpose\s*:\s*["']maskable["']/.test(
          manifestSource,
        ),
    ],
  ];

  for (
    const [
      id,
      name,
      passed,
    ] of manifestChecks
  ) {
    addCheck(report, {
      id,
      name,
      passed,
      details: passed
        ? "Configured."
        : "Manifest source is incomplete.",
    });
  }
}

const expectedIconDimensions = [
  [
    "public/icons/bopa-192.png",
    192,
    192,
  ],
  [
    "public/icons/bopa-512.png",
    512,
    512,
  ],
  [
    "public/icons/bopa-maskable-512.png",
    512,
    512,
  ],
];

for (
  const [
    relativePath,
    expectedWidth,
    expectedHeight,
  ] of expectedIconDimensions
) {
  const iconPath = safePath(
    projectRoot,
    relativePath,
  );

  if (!(await fileExists(iconPath))) {
    continue;
  }

  try {
    const dimensions =
      await readPngDimensions(
        iconPath,
      );
    const passed =
      dimensions.width ===
        expectedWidth &&
      dimensions.height ===
        expectedHeight;

    addCheck(report, {
      id: `icon:${relativePath}`,
      name:
        `Icon dimensions: ${relativePath}`,
      passed,
      details:
        `${dimensions.width}×${dimensions.height}; expected ${expectedWidth}×${expectedHeight}.`,
    });
  } catch (error) {
    addCheck(report, {
      id: `icon:${relativePath}`,
      name:
        `Icon validity: ${relativePath}`,
      passed: false,
      details:
        error instanceof Error
          ? error.message
          : "Unable to inspect PNG.",
    });
  }
}

if (
  await fileExists(
    safePath(
      projectRoot,
      "public/sw.js",
    ),
  )
) {
  const serviceWorker =
    await readProjectFile(
      "public/sw.js",
    );

  const workerChecks = [
    [
      "worker:version",
      "Service worker uses the Phase 5 bounded cache",
      /bopa-pwa-shell-v5/.test(
        serviceWorker,
      ),
    ],
    [
      "worker:sensitive",
      "Service worker excludes API, payment, and report paths",
      /["']\/api\/["']/.test(
        serviceWorker,
      ) &&
        /["']\/pay\/["']/.test(
          serviceWorker,
        ) &&
        /["']\/m\/report\/["']/.test(
          serviceWorker,
        ),
    ],
    [
      "worker:limits",
      "Service worker enforces entry, age, and response-size limits",
      /MAX_CACHE_ENTRIES\s*=\s*180/.test(
        serviceWorker,
      ) &&
        /MAX_CACHE_AGE_MS/.test(
          serviceWorker,
        ) &&
        /MAX_CACHE_RESPONSE_BYTES/.test(
          serviceWorker,
        ),
    ],
    [
      "worker:private",
      "Service worker rejects private and no-store responses",
      /no-store/.test(
        serviceWorker,
      ) &&
        /private/.test(
          serviceWorker,
        ),
    ],
    [
      "worker:update",
      "Service worker update requires an explicit skip-waiting message",
      /SKIP_WAITING/.test(
        serviceWorker,
      ) &&
        !/self\.skipWaiting\(\)\s*;?\s*\}\s*\)\s*;?\s*$/.test(
          serviceWorker,
        ),
    ],
    [
      "worker:offline",
      "Service worker includes public and workspace offline fallbacks",
      /offline\.html/.test(
        serviceWorker,
      ) &&
        /offline-workspace\.html/.test(
          serviceWorker,
        ),
    ],
  ];

  for (
    const [
      id,
      name,
      passed,
    ] of workerChecks
  ) {
    addCheck(report, {
      id,
      name,
      passed,
      details: passed
        ? "Configured."
        : "Service-worker policy is incomplete.",
    });
  }
}

const noStoreRoutes = [
  "src/app/api/offline/read/route.ts",
  "src/app/api/offline/push/route.ts",
];

for (const relativePath of noStoreRoutes) {
  const routePath = safePath(
    projectRoot,
    relativePath,
  );

  if (!(await fileExists(routePath))) {
    continue;
  }

  const source =
    await readText(routePath);
  const passed =
    /Cache-Control/.test(source) &&
    /no-store/.test(source);

  addCheck(report, {
    id: `no-store:${relativePath}`,
    name:
      `Offline API is non-cacheable: ${relativePath}`,
    passed,
    details: passed
      ? "No-store response headers are present."
      : "No-store headers were not found.",
  });
}

const sensitiveFieldPatterns = [
  /\bnin\b/i,
  /\bbvn\b/i,
  /\bbank_account\b/i,
  /\baccount_number\b/i,
  /\bpaystack_secret\b/i,
  /\bservice_role_key\b/i,
  /\bkyc_document\b/i,
  /\bagreement_pdf\b/i,
  /\breceipt_url\b/i,
];

const localDataFiles = [
  "src/server/offline/read-snapshot.service.ts",
  "public/offline-write.js",
  "src/lib/offline/types.ts",
];

for (const relativePath of localDataFiles) {
  const filePath = safePath(
    projectRoot,
    relativePath,
  );

  if (!(await fileExists(filePath))) {
    continue;
  }

  const source =
    await readText(filePath);
  const detected =
    sensitiveFieldPatterns
      .filter((pattern) =>
        pattern.test(source),
      )
      .map((pattern) =>
        pattern.toString(),
      );
  const passed =
    detected.length === 0;

  addCheck(report, {
    id:
      `sensitive-local:${relativePath}`,
    name:
      `No prohibited local-data fields: ${relativePath}`,
    passed,
    details: passed
      ? "No prohibited fields detected."
      : `Detected: ${detected.join(", ")}`,
  });
}

const clientAndPublicDirectories = [
  "public",
  "src/components",
  "src/lib/offline",
];

const secretPatterns = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_WEBHOOK_SECRET",
];

async function walk(directoryPath) {
  const entries = await fs.readdir(
    directoryPath,
    {
      withFileTypes: true,
    },
  );
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(
      directoryPath,
      entry.name,
    );

    if (
      entry.isDirectory()
    ) {
      files.push(
        ...(await walk(fullPath)),
      );
    } else if (
      entry.isFile()
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

for (
  const relativeDirectory of
  clientAndPublicDirectories
) {
  const directoryPath = safePath(
    projectRoot,
    relativeDirectory,
  );

  try {
    const files =
      await walk(directoryPath);
    const findings = [];

    for (const filePath of files) {
      if (
        !/\.(?:js|mjs|ts|tsx|json|html|css)$/i.test(
          filePath,
        )
      ) {
        continue;
      }

      const source =
        await readText(filePath);

      for (
        const secretName of
        secretPatterns
      ) {
        if (source.includes(secretName)) {
          findings.push(
            `${path.relative(
              projectRoot,
              filePath,
            )}: ${secretName}`,
          );
        }
      }
    }

    addCheck(report, {
      id:
        `secrets:${relativeDirectory}`,
      name:
        `No server secret names in ${relativeDirectory}`,
      passed:
        findings.length === 0,
      details:
        findings.length === 0
          ? "No secret identifiers detected."
          : findings.join("; "),
    });
  } catch {
    addCheck(report, {
      id:
        `secrets:${relativeDirectory}`,
      name:
        `No server secret names in ${relativeDirectory}`,
      passed: false,
      details:
        "Directory could not be inspected.",
    });
  }
}

const migrationChecks = [
  {
    file:
      "supabase/migrations/20260717000000_offline_safe_mutations.sql",
    patterns: [
      /enable row level security/i,
      /revoke all/i,
      /to service_role/i,
      /apply_offline_safe_mutation/i,
    ],
    name:
      "Offline mutation migration is RLS-protected and service-role-only",
  },
  {
    file:
      "supabase/migrations/20260717010000_offline_sync_hardening.sql",
    patterns: [
      /prune_offline_mutation_receipts/i,
      /to service_role/i,
      /90 days/i,
      /180 days/i,
    ],
    name:
      "Offline receipt retention migration is present",
  },
];

for (const check of migrationChecks) {
  const migrationPath = safePath(
    projectRoot,
    check.file,
  );

  if (!(await fileExists(migrationPath))) {
    continue;
  }

  const source =
    await readText(migrationPath);
  const passed =
    check.patterns.every(
      (pattern) =>
        pattern.test(source),
    );

  addCheck(report, {
    id:
      `migration:${check.file}`,
    name: check.name,
    passed,
    details: passed
      ? "Required controls are present."
      : "One or more required controls are missing.",
  });
}

const {
  jsonPath,
  markdownPath,
} = await writeReportFiles(
  report,
  outputDirectory,
  "pwa-static-readiness",
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
