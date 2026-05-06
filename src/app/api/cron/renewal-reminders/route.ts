import { NextRequest, NextResponse } from "next/server";
import { prepareRenewalRemindersSystem } from "@/server/services/renewal-reminders.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCronSecret() {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return null;
  }

  return secret;
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = getCronSecret();

  if (!secret) {
    return false;
  }

  const bearerToken = getBearerToken(request);

  if (bearerToken && bearerToken === secret) {
    return true;
  }

  const querySecret = request.nextUrl.searchParams.get("secret")?.trim();

  return querySecret === secret;
}

function getRunDate(request: NextRequest) {
  const runDate = request.nextUrl.searchParams.get("runDate")?.trim();

  if (!runDate) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate)) {
    return null;
  }

  return runDate;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized cron request.",
      },
      {
        status: 401,
      },
    );
  }

  const runDate = getRunDate(request);

  if (runDate === null) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid runDate. Use YYYY-MM-DD.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const result = await prepareRenewalRemindersSystem(runDate);

    return NextResponse.json(
      {
        ok: true,
        status: "processed",
        ...result,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("renewal-reminders cron failed:", error);

    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        message: "Renewal reminders could not be prepared.",
      },
      {
        status: 500,
      },
    );
  }
}
