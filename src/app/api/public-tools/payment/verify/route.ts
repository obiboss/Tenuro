import { NextResponse } from "next/server";
import { verifyPublicDocumentPayment } from "@/server/services/public-document-payment.service";
import {
  assertPendingPaymentIntent,
  getPublicDocumentPaymentIntent,
  markPublicDocumentPaymentIntentVerified,
} from "@/server/services/public-document-payment-tracking.service";
import { verifyPaystackTransaction } from "@/server/services/paystack.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const product = url.searchParams.get("product");
  const reference = url.searchParams.get("reference");

  if (
    (product !== "receipt" && product !== "tenancy_agreement") ||
    !reference
  ) {
    return NextResponse.json(
      { message: "Payment reference is required." },
      { status: 400 },
    );
  }

  const transaction = await verifyPaystackTransaction(reference);
  const intent = await getPublicDocumentPaymentIntent(reference);
  const shouldGrant = assertPendingPaymentIntent({
    intent,
    product,
    amountKobo: transaction.amount,
    currency: transaction.currency,
  });

  if (!shouldGrant) {
    return NextResponse.json({ granted: false, alreadyVerified: true });
  }

  const result = await verifyPublicDocumentPayment({
    product,
    reference,
  });
  await markPublicDocumentPaymentIntentVerified(reference);
  return NextResponse.json(result);
}
