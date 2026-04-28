import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { processGatewayPaystackWebhook } from "@/server/services/gateway-payment-webhook.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    const result = await processGatewayPaystackWebhook({
      rawBody,
      signature,
    });

    return NextResponse.json(
      {
        ok: result.status !== "failed",
        status: result.status,
        message: result.message,
        paymentId: result.paymentId ?? null,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        {
          ok: false,
          message: error.userMessage,
        },
        {
          status: error.status,
        },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Paystack webhook could not be processed.",
      },
      {
        status: 500,
      },
    );
  }
}
