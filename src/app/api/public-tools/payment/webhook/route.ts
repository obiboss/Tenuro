import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { processGatewayPaystackWebhook } from "@/server/services/gateway-payment-webhook.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await processGatewayPaystackWebhook({
      rawBody: await request.text(),
      signature: request.headers.get("x-paystack-signature"),
    });

    return NextResponse.json(
      { ok: result.status !== "failed", status: result.status },
      { status: result.status === "failed" ? 500 : 200 },
    );
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { ok: false, message: error.userMessage },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, message: "Paystack webhook could not be processed." },
      { status: 500 },
    );
  }
}
