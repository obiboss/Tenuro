import fs from "node:fs/promises";
import path from "node:path";

export const REPORT_VERSION = 1;

export function createReport({
  title,
  target,
}) {
  return {
    reportVersion: REPORT_VERSION,
    title,
    target,
    generatedAt: new Date().toISOString(),
    passed: true,
    checks: [],
  };
}

export function addCheck(
  report,
  {
    id,
    name,
    passed,
    severity = "error",
    details = "",
  },
) {
  report.checks.push({
    id,
    name,
    passed: Boolean(passed),
    severity,
    details,
  });

  if (!passed && severity === "error") {
    report.passed = false;
  }
}

export async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function directoryExists(
  directoryPath,
) {
  try {
    const stat = await fs.stat(directoryPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

export async function readJson(filePath) {
  return JSON.parse(
    await fs.readFile(filePath, "utf8"),
  );
}

export async function readPngDimensions(
  filePath,
) {
  const handle = await fs.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(24);
    const {
      bytesRead,
    } = await handle.read(
      buffer,
      0,
      buffer.length,
      0,
    );

    if (bytesRead < 24) {
      throw new Error(
        "PNG file is too small.",
      );
    }

    const signature =
      buffer.subarray(0, 8);
    const expectedSignature =
      Buffer.from([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10,
      ]);

    if (
      !signature.equals(
        expectedSignature,
      )
    ) {
      throw new Error(
        "File is not a valid PNG.",
      );
    }

    const chunkType =
      buffer
        .subarray(12, 16)
        .toString("ascii");

    if (chunkType !== "IHDR") {
      throw new Error(
        "PNG does not contain an IHDR header.",
      );
    }

    return {
      width:
        buffer.readUInt32BE(16),
      height:
        buffer.readUInt32BE(20),
    };
  } finally {
    await handle.close();
  }
}

export function readPngDimensionsFromBuffer(
  buffer,
) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 24
  ) {
    throw new Error(
      "PNG response is too small.",
    );
  }

  const signature =
    buffer.subarray(0, 8);
  const expectedSignature =
    Buffer.from([
      137,
      80,
      78,
      71,
      13,
      10,
      26,
      10,
    ]);

  if (
    !signature.equals(
      expectedSignature,
    )
  ) {
    throw new Error(
      "Response is not a valid PNG.",
    );
  }

  const chunkType =
    buffer
      .subarray(12, 16)
      .toString("ascii");

  if (chunkType !== "IHDR") {
    throw new Error(
      "PNG response does not contain an IHDR header.",
    );
  }

  return {
    width:
      buffer.readUInt32BE(16),
    height:
      buffer.readUInt32BE(20),
  };
}

export function normalizeBaseUrl(
  value,
) {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error(
      "Production verification requires an HTTPS URL.",
    );
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";

  return url;
}

export async function fetchWithTimeout(
  input,
  init = {},
  timeoutMs = 15_000,
) {
  const controller =
    new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    return await fetch(input, {
      ...init,
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function parseCacheControl(
  value,
) {
  const directives = new Map();

  for (
    const rawDirective of
    String(value ?? "").split(",")
  ) {
    const directive =
      rawDirective.trim();

    if (!directive) {
      continue;
    }

    const [
      rawName,
      rawValue,
    ] = directive.split("=", 2);
    const name =
      rawName.trim().toLowerCase();
    const directiveValue =
      rawValue
        ?.trim()
        .replace(/^"|"$/g, "") ??
      true;

    directives.set(
      name,
      directiveValue,
    );
  }

  return directives;
}

export function cacheControlIsSafeForWorker(
  value,
) {
  const directives =
    parseCacheControl(value);

  if (
    directives.has("immutable")
  ) {
    return false;
  }

  const maxAge = Number(
    directives.get("max-age"),
  );

  return (
    !Number.isFinite(maxAge) ||
    maxAge <= 3600
  );
}

export function cacheControlIsNoStore(
  value,
) {
  return parseCacheControl(
    value,
  ).has("no-store");
}

export function contentTypeIncludes(
  response,
  expected,
) {
  return String(
    response.headers.get(
      "content-type",
    ) ?? "",
  )
    .toLowerCase()
    .includes(
      expected.toLowerCase(),
    );
}

export function safePath(
  root,
  relativePath,
) {
  const resolvedRoot =
    path.resolve(root);
  const resolvedPath =
    path.resolve(
      resolvedRoot,
      relativePath,
    );

  if (
    resolvedPath !== resolvedRoot &&
    !resolvedPath.startsWith(
      `${resolvedRoot}${path.sep}`,
    )
  ) {
    throw new Error(
      "Resolved path escaped the project root.",
    );
  }

  return resolvedPath;
}

function statusSymbol(check) {
  if (check.passed) {
    return "PASS";
  }

  return check.severity === "warning"
    ? "WARN"
    : "FAIL";
}

export function printReport(report) {
  console.log("");
  console.log(report.title);
  console.log(`Target: ${report.target}`);
  console.log(
    `Generated: ${report.generatedAt}`,
  );
  console.log("");

  for (const check of report.checks) {
    console.log(
      `[${statusSymbol(check)}] ${check.name}`,
    );

    if (check.details) {
      console.log(
        `       ${check.details}`,
      );
    }
  }

  const failed =
    report.checks.filter(
      (check) =>
        !check.passed &&
        check.severity === "error",
    ).length;
  const warnings =
    report.checks.filter(
      (check) =>
        !check.passed &&
        check.severity === "warning",
    ).length;

  console.log("");
  console.log(
    report.passed
      ? `Result: READY (${warnings} warning${warnings === 1 ? "" : "s"})`
      : `Result: NOT READY (${failed} failure${failed === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"})`,
  );
}

export async function writeReportFiles(
  report,
  outputDirectory,
  basename,
) {
  await fs.mkdir(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const jsonPath = path.join(
    outputDirectory,
    `${basename}.json`,
  );
  const markdownPath = path.join(
    outputDirectory,
    `${basename}.md`,
  );

  await fs.writeFile(
    jsonPath,
    `${JSON.stringify(
      report,
      null,
      2,
    )}\n`,
    "utf8",
  );

  const lines = [
    `# ${report.title}`,
    "",
    `- Target: \`${report.target}\``,
    `- Generated: ${report.generatedAt}`,
    `- Result: **${report.passed ? "READY" : "NOT READY"}**`,
    "",
    "## Checks",
    "",
  ];

  for (const check of report.checks) {
    const label = check.passed
      ? "PASS"
      : check.severity === "warning"
        ? "WARN"
        : "FAIL";

    lines.push(
      `### ${label} — ${check.name}`,
      "",
      check.details || "No additional details.",
      "",
    );
  }

  await fs.writeFile(
    markdownPath,
    `${lines.join("\n")}\n`,
    "utf8",
  );

  return {
    jsonPath,
    markdownPath,
  };
}

export function getArgument(
  args,
  name,
) {
  const index =
    args.indexOf(name);

  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}
