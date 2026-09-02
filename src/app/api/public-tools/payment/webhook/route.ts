import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import {
  getPublicDocumentPaymentIntent,
  markPublicDocumentPaymentIntentVerified,
} from "@/server/services/public-document-payment-tracking.service";
import type { PublicDocumentProduct } from "@/server/services/public-document-entitlement.service";

function getPaystackSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY ?? "";
}

function hasValidSignature(rawBody: string, signature: string | null) {
  const secretKey = getPaystackSecretKey();
  if (!signature || !secretKey) {
    return false;
  }

  const expected = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!hasValidSignature(rawBody, signature)) {
    return new NextResponse(null, { status: 401 });
  }

  let event: {
    event?: unknown;
    data?: {
      reference?: unknown;
      amount?: unknown;
      currency?: unknown;
    };
  };

  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const reference = event.data?.reference;
  const amount = event.data?.amount;
  const currency = event.data?.currency;
  if (
    typeof reference !== "string" ||
    typeof amount !== "number" ||
    typeof currency !== "string"
  ) {
    return NextResponse.json({ ok: true });
  }

  const intent = await getPublicDocumentPaymentIntent(reference);
  if (!intent) {
    return NextResponse.json({ ok: true });
  }

  const product = intent.package_identifier as PublicDocumentProduct;
  if (
    intent.status === "verified" ||
    intent.status !== "pending" ||
    intent.expected_amount_kobo !== amount ||
    intent.expected_currency !== currency
  ) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await createSupabaseAdminClient().rpc(
    "grant_public_document_package",
    {
      p_identity_fingerprint: intent.identity_fingerprint,
      p_product_type: product,
      p_payment_reference: intent.reference,
      p_amount_kobo: intent.expected_amount_kobo,
      p_credits: intent.credit_count,
    },
  );

  if (!error) {
    await markPublicDocumentPaymentIntentVerified(reference);
  }

  return NextResponse.json({ ok: true });
}
