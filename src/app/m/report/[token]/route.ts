import { NextResponse } from "next/server";
import { getPublicManagerStatementDocumentDownload } from "@/server/services/manager-public-statement-document.service";
import { managerDocumentShareTokenSchema } from "@/server/validators/manager-document-share.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function unavailableResponse() {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Report unavailable</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #f6f8fb;
      color: #172033;
      font-family: Arial, Helvetica, sans-serif;
    }
    main {
      width: min(100%, 480px);
      border: 1px solid #dde5f2;
      border-radius: 18px;
      background: #ffffff;
      padding: 28px;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
    }
    strong {
      display: block;
      font-size: 22px;
      line-height: 1.2;
    }
    p {
      margin: 12px 0 0;
      color: #64748b;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.6;
    }
    small {
      display: block;
      margin-top: 20px;
      color: #64748b;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main>
    <strong>This report link is unavailable</strong>
    <p>
      The link may have expired or been replaced. Please ask the property
      manager to send a new report link.
    </p>
    <small>Powered by BOPA — Boldverse Property App</small>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function safeFileName(value: string) {
  const cleaned = value
    .replace(/[\r\n"]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 160);

  return cleaned || "bopa-report.pdf";
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { token } = await context.params;
    const parsedToken =
      managerDocumentShareTokenSchema.parse(token);

    const download =
      await getPublicManagerStatementDocumentDownload(
        parsedToken,
      );
    const fileName = safeFileName(download.fileName);

    return new NextResponse(download.fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "Content-Security-Policy":
          "default-src 'none'; frame-ancestors 'none'; sandbox",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return unavailableResponse();
  }
}
