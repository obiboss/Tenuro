import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  initializeStandardPaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { PublicDocumentProduct } from "@/server/services/public-document-entitlement.service";

const PAYMENT_CONFIG: Record<
  PublicDocumentProduct,
  { amountKobo: number; credits: number }
> = {
  receipt: { amountKobo: 250000, credits: 24 },
  tenancy_agreement: { amountKobo: 1000000, credits: 3 },
};

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
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

export async function verifyPublicDocumentPayment(params: {
  product: PublicDocumentProduct;
  reference: string;
  identityFingerprint?: string;
}) {
  const config = PAYMENT_CONFIG[params.product];
  const transaction = await verifyPaystackTransaction(params.reference);

  if (
    transaction.status !== "success" ||
    transaction.amount !== config.amountKobo ||
    transaction.currency !== "NGN"
  ) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_INVALID",
      "Payment could not be verified.",
      402,
    );
  }

  const metadata = transaction.metadata as Record<string, unknown> | null;
  const identityFingerprint =
    params.identityFingerprint ??
    (typeof metadata?.identity_fingerprint === "string"
      ? metadata.identity_fingerprint
      : null);
  if (metadata?.product_type !== params.product || !identityFingerprint) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_INVALID",
      "Payment could not be verified.",
      402,
    );
  }

  const { data, error } = await createSupabaseAdminClient().rpc(
    "grant_public_document_package",
    {
      p_identity_fingerprint: identityFingerprint,
      p_product_type: params.product,
      p_payment_reference: transaction.reference,
      p_amount_kobo: config.amountKobo,
      p_credits: config.credits,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}
