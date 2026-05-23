import { NextResponse } from "next/server";
import { AppError } from "@/server/errors/app-error";
import { getCurrentPayoutVerificationStatus } from "@/server/services/paystack-verification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getCurrentPayoutVerificationStatus();

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.userMessage,
        },
        { status: error.status },
      );
    }

    throw error;
  }
}
