import { NextRequest, NextResponse } from "next/server";
import { postDueRentChargesSystem } from "@/server/services/rent-charges.service";

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

  try {
    const result = await postDueRentChargesSystem();

    return NextResponse.json(
      {
        ok: true,
        status: "processed",
        postedCount: result.postedCount,
        postedCharges: result.postedCharges,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("rent-charges cron failed:", error);

    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        message: "Rent charge posting failed.",
      },
      {
        status: 500,
      },
    );
  }
}
