import "server-only";

import { AppError } from "@/server/errors/app-error";
import type { PublicDocumentProduct } from "@/server/services/public-document-entitlement.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const PUBLIC_DOCUMENT_PAYMENT_PACKAGES: Record<
  PublicDocumentProduct,
  { amountKobo: number; creditCount: number; currency: "NGN" }
> = {
  receipt: { amountKobo: 250000, creditCount: 24, currency: "NGN" },
  tenancy_agreement: {
    amountKobo: 1000000,
    creditCount: 3,
    currency: "NGN",
  },
};

type PaymentIntentRow = {
  reference: string;
  identity_fingerprint: string;
  package_identifier: PublicDocumentProduct;
  expected_amount_kobo: number;
  expected_currency: "NGN";
  credit_count: number;
  status: "pending" | "verified" | "failed";
};

function getPackage(product: PublicDocumentProduct) {
  return PUBLIC_DOCUMENT_PAYMENT_PACKAGES[product];
}

export async function trackPublicDocumentPaymentIntent(params: {
  reference: string;
  identityFingerprint: string;
  product: PublicDocumentProduct;
}) {
  const supabase = createSupabaseAdminClient();
  const packageConfig = getPackage(params.product);
  const since = new Date(Date.now() - 60_000).toISOString();

  const { count, error: countError } = await supabase
    .from("public_document_payment_intents")
    .select("id", { count: "exact", head: true })
    .eq("identity_fingerprint", params.identityFingerprint)
    .gte("created_at", since);

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) >= 5) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_RATE_LIMITED",
      "Too many payment attempts. Please wait a moment and try again.",
      429,
    );
  }

  const { error } = await supabase.from("public_document_payment_intents").insert({
    reference: params.reference,
    identity_fingerprint: params.identityFingerprint,
    package_identifier: params.product,
    expected_amount_kobo: packageConfig.amountKobo,
    expected_currency: packageConfig.currency,
    credit_count: packageConfig.creditCount,
    status: "pending",
  });

  if (error) {
    throw error;
  }
}

export async function getPublicDocumentPaymentIntent(reference: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("public_document_payment_intents")
    .select(
      "reference, identity_fingerprint, package_identifier, expected_amount_kobo, expected_currency, credit_count, status",
    )
    .eq("reference", reference)
    .maybeSingle<PaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export function assertPendingPaymentIntent(params: {
  intent: PaymentIntentRow | null;
  product: PublicDocumentProduct;
  amountKobo?: number;
  currency?: string;
}) {
  if (!params.intent) {
    throw new AppError("PUBLIC_DOCUMENT_PAYMENT_INVALID", "Payment could not be verified.", 402);
  }

  if (params.intent.status === "verified") {
    return false;
  }

  if (
    params.intent.status !== "pending" ||
    params.intent.package_identifier !== params.product ||
    (params.amountKobo !== undefined &&
      params.intent.expected_amount_kobo !== params.amountKobo) ||
    (params.currency !== undefined &&
      params.intent.expected_currency !== params.currency)
  ) {
    throw new AppError("PUBLIC_DOCUMENT_PAYMENT_INVALID", "Payment could not be verified.", 402);
  }

  return true;
}

export async function markPublicDocumentPaymentIntentVerified(reference: string) {
  const { error } = await createSupabaseAdminClient()
    .from("public_document_payment_intents")
    .update({ status: "verified", updated_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "pending");

  if (error) {
    throw error;
  }
}
