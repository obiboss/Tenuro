import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  initializeStandardPaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { PublicDocumentProduct } from "@/server/services/public-document-entitlement.service";
import {
  assertPendingPaymentIntent,
  getPublicDocumentPaymentIntent,
  markPublicDocumentPaymentIntentVerified,
} from "@/server/services/public-document-payment-tracking.service";

const PAYMENT_CONFIG: Record<
  PublicDocumentProduct,
  { amountKobo: number; credits: number }
> = {
  receipt: { amountKobo: 250000, credits: 24 },
  tenancy_agreement: { amountKobo: 1000000, credits: 3 },
};

type PublicDocumentPaymentConfirmation = {
  granted: boolean;
  alreadyVerified?: boolean;
  free_remaining?: number;
  paid_remaining?: number;
  remaining?: number;
};

function appUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const value =
    configuredUrl ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new AppError(
      "PUBLIC_PAYMENT_APP_URL_INVALID",
      "Public payment callback is not configured.",
      500,
    );
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    (process.env.NODE_ENV === "production" &&
      ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname))
  ) {
    throw new AppError(
      "PUBLIC_PAYMENT_APP_URL_INVALID",
      "Public payment callback is not configured.",
      500,
    );
  }

  return value.replace(/\/$/, "");
}

export async function initializePublicDocumentPayment(params: {
  product: PublicDocumentProduct;
  email: string;
  identityFingerprint: string;
}) {
  const config = PAYMENT_CONFIG[params.product];
  const reference = `BOPA-DOC-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;

  return initializeStandardPaystackTransaction({
    email: params.email,
    amountKobo: config.amountKobo,
    reference,
    callbackUrl: `${appUrl()}/api/public-tools/payment/verify?product=${params.product}`,
    currencyCode: "NGN",
    metadata: {
      product_type: params.product,
      identity_fingerprint: params.identityFingerprint,
      credits: config.credits,
    },
  });
}

export async function confirmPublicDocumentPayment(params: {
  reference: string;
  expectedProduct?: PublicDocumentProduct;
}): Promise<PublicDocumentPaymentConfirmation> {
  const intent = await getPublicDocumentPaymentIntent(params.reference);

  if (!intent) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_INVALID",
      "Payment could not be verified.",
      402,
    );
  }

  if (
    params.expectedProduct &&
    intent.package_identifier !== params.expectedProduct
  ) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_INVALID",
      "Payment could not be verified.",
      402,
    );
  }

  const shouldGrant = assertPendingPaymentIntent({
    intent,
    product: intent.package_identifier,
  });

  if (!shouldGrant) {
    return { granted: false, alreadyVerified: true };
  }

  const product = intent.package_identifier;
  const config = PAYMENT_CONFIG[product];
  const transaction = await verifyPaystackTransaction(params.reference);

  if (
    transaction.status !== "success" ||
    transaction.reference !== intent.reference ||
    transaction.amount !== intent.expected_amount_kobo ||
    transaction.currency !== intent.expected_currency ||
    intent.expected_amount_kobo !== config.amountKobo ||
    intent.credit_count !== config.credits
  ) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_INVALID",
      "Payment could not be verified.",
      402,
    );
  }

  const metadata = transaction.metadata as Record<string, unknown> | null;
  const metadataCredits = metadata?.credits;
  if (
    metadata?.product_type !== product ||
    metadata?.identity_fingerprint !== intent.identity_fingerprint ||
    (metadataCredits !== undefined && metadataCredits !== intent.credit_count)
  ) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_INVALID",
      "Payment could not be verified.",
      402,
    );
  }

  const { data, error } = await createSupabaseAdminClient().rpc(
    "grant_public_document_package",
    {
      p_identity_fingerprint: intent.identity_fingerprint,
      p_product_type: product,
      p_payment_reference: transaction.reference,
      p_amount_kobo: intent.expected_amount_kobo,
      p_credits: intent.credit_count,
    },
  );

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object" || !("granted" in data)) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_GRANT_FAILED",
      "Payment was verified, but document credits could not be confirmed.",
      500,
    );
  }

  await markPublicDocumentPaymentIntentVerified(params.reference);
  return data as PublicDocumentPaymentConfirmation;
}

export async function verifyPublicDocumentPayment(params: {
  product: PublicDocumentProduct;
  reference: string;
}) {
  return confirmPublicDocumentPayment({
    reference: params.reference,
    expectedProduct: params.product,
  });
}
