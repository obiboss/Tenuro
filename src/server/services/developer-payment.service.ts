import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  calculateDeveloperInstallmentFee,
  getDeveloperInstallmentFeePercentage,
} from "@/server/constants/developer-installment-fees";
import { createDeveloperPaymentAllocations } from "@/server/repositories/developer-payment-allocations.repository";
import {
  createDeveloperPaymentIntent,
  getDeveloperPaymentIntentByIdempotencyKey,
  getDeveloperPaymentIntentByReference,
} from "@/server/repositories/developer-payment-intents.repository";
import { getActiveDeveloperPaymentPlanForSale } from "@/server/repositories/developer-payment-plans.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import {
  assertPaystackAmountMatchesExpected,
  initializeStandardPaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { convertNairaToKobo } from "@/server/utils/money";

function getAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!configuredUrl) {
    throw new AppError(
      "APP_URL_MISSING",
      "Application URL is not configured.",
      500,
    );
  }

  return configuredUrl.replace(/\/$/, "");
}

function createDeveloperPaymentReference() {
  return `BPD-${crypto.randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase()}`;
}

function createIdempotencyKey(params: {
  saleId: string;
  scheduleItemId: string | null;
  amount: number;
}) {
  return [
    "developer-payment-request",
    params.saleId,
    params.scheduleItemId ?? "custom",
    params.amount.toFixed(2),
  ].join(":");
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export async function createDeveloperPaymentRequest(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  saleId: string;
  scheduleItemId: string | null;
  amount: number;
  buyerEmail: string | null;
}) {
  const sale = await getDeveloperSaleById(params.supabase, {
    developerAccountId: params.developerAccountId,
    saleId: params.saleId,
  });

  if (!sale || sale.status !== "active") {
    throw new AppError(
      "DEVELOPER_SALE_NOT_FOUND",
      "Active sale was not found.",
    );
  }

  const activePlan = await getActiveDeveloperPaymentPlanForSale(
    params.supabase,
    {
      developerAccountId: params.developerAccountId,
      saleId: sale.id,
    },
  );

  if (!activePlan) {
    throw new AppError(
      "DEVELOPER_PAYMENT_PLAN_REQUIRED",
      "Create a payment plan before sending payment requests.",
    );
  }

  if (params.amount > Number(sale.total_price_locked)) {
    throw new AppError(
      "DEVELOPER_PAYMENT_AMOUNT_TOO_HIGH",
      "Payment amount cannot exceed the locked sale price.",
    );
  }

  const idempotencyKey = createIdempotencyKey({
    saleId: sale.id,
    scheduleItemId: params.scheduleItemId,
    amount: params.amount,
  });

  const existingIntent = await getDeveloperPaymentIntentByIdempotencyKey(
    params.supabase,
    {
      developerAccountId: params.developerAccountId,
      idempotencyKey,
    },
  );

  if (
    existingIntent?.status === "initialized" &&
    existingIntent.authorization_url
  ) {
    return existingIntent;
  }

  const fee = calculateDeveloperInstallmentFee(params.amount);
  const totalAmount = Number((params.amount + fee.feeAmount).toFixed(2));
  const reference = createDeveloperPaymentReference();
  const appUrl = getAppUrl();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const buyerEmail =
    params.buyerEmail ||
    sale.developer_buyers?.email ||
    `developer-buyer-${sale.buyer_id}@boldverseproperty.com`;

  const metadata = {
    product: "boldverse_developer_module",
    payment_type: "developer_installment",
    developer_account_id: params.developerAccountId,
    sale_id: sale.id,
    buyer_id: sale.buyer_id,
    estate_id: sale.estate_id,
    plot_id: sale.plot_id,
    schedule_item_id: params.scheduleItemId,
    installment_amount: params.amount,
    platform_fee_amount: fee.feeAmount,
    platform_fee_percentage: fee.percentage,
    total_amount: totalAmount,
    currency_code: "NGN",
  };

  const initialized = await initializeStandardPaystackTransaction({
    email: buyerEmail,
    amountKobo: convertNairaToKobo(totalAmount),
    reference,
    callbackUrl: `${appUrl}/dev/pay/${reference}?verify=1`,
    currencyCode: "NGN",
    metadata,
  });

  const intent = await createDeveloperPaymentIntent(params.supabase, {
    developerAccountId: params.developerAccountId,
    saleId: sale.id,
    buyerId: sale.buyer_id,
    estateId: sale.estate_id,
    plotId: sale.plot_id,
    scheduleItemId: params.scheduleItemId,
    paystackReference: reference,
    paystackAccessCode: initialized.access_code,
    authorizationUrl: initialized.authorization_url,
    installmentAmount: params.amount,
    platformFeeAmount: fee.feeAmount,
    totalAmount,
    currencyCode: "NGN",
    expiresAt,
    idempotencyKey,
    metadata,
  });

  await createDeveloperPaymentAllocations(params.supabase, {
    developerAccountId: params.developerAccountId,
    paymentIntentId: intent.id,
    saleId: sale.id,
    buyerId: sale.buyer_id,
    installmentAmount: params.amount,
    platformFeeAmount: fee.feeAmount,
    currencyCode: "NGN",
  });

  return intent;
}

export async function getPublicDeveloperPaymentCheckout(params: {
  supabase: SupabaseClient;
  reference: string;
  verify?: boolean;
}) {
  if (params.verify) {
    await verifyAndPostDeveloperPaymentReference({
      supabase: params.supabase,
      reference: params.reference,
    });
  }

  return getDeveloperPaymentIntentByReference(
    params.supabase,
    params.reference,
  );
}

export async function verifyAndPostDeveloperPaymentReference(params: {
  supabase: SupabaseClient;
  reference: string;
}) {
  const intent = await getDeveloperPaymentIntentByReference(
    params.supabase,
    params.reference,
  );

  if (!intent) {
    throw new AppError(
      "DEVELOPER_PAYMENT_INTENT_NOT_FOUND",
      "Payment request was not found.",
      404,
    );
  }

  if (intent.status === "paid" && intent.processed_payment_id) {
    return {
      status: "duplicate" as const,
      paymentId: intent.processed_payment_id,
    };
  }

  if (intent.status !== "initialized") {
    throw new AppError(
      "DEVELOPER_PAYMENT_INTENT_NOT_PAYABLE",
      "This payment request can no longer be verified.",
    );
  }

  const verified = await verifyPaystackTransaction(params.reference);

  if (verified.reference !== intent.paystack_reference) {
    throw new AppError(
      "DEVELOPER_PAYSTACK_REFERENCE_MISMATCH",
      "Payment reference does not match.",
    );
  }

  if (verified.currency !== intent.currency_code) {
    throw new AppError(
      "DEVELOPER_PAYSTACK_CURRENCY_MISMATCH",
      "Payment currency does not match.",
    );
  }

  if (verified.status !== "success") {
    throw new AppError(
      "DEVELOPER_PAYSTACK_NOT_SUCCESSFUL",
      "Payment was not successful.",
    );
  }

  assertPaystackAmountMatchesExpected({
    paystackAmountInKobo: verified.amount,
    expectedAmountInNaira: intent.total_amount,
  });

  const { data, error } = await params.supabase
    .rpc("post_developer_verified_payment", {
      p_payment_intent_id: intent.id,
      p_paystack_reference: intent.paystack_reference,
      p_verified_total_amount: intent.total_amount,
      p_verified_paid_at: verified.paid_at ?? new Date().toISOString(),
    })
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return {
    status: "processed" as const,
    paymentId: data.id,
    verifiedPayload: toRecord(verified),
  };
}

export function getDeveloperPaymentFeePercentage(amount: number) {
  return getDeveloperInstallmentFeePercentage(amount);
}
