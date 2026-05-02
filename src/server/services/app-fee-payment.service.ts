import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createAppFeePaymentIntent,
  getAppFeePaymentIntentByIdempotencyKey,
  getAppFeePaymentIntentByReference,
  markAppFeePaymentIntentFailed,
  markAppFeePaymentIntentPaid,
} from "@/server/repositories/app-fee-payment.repository";
import { getRentPaymentById } from "@/server/repositories/payments.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { InitializeAppFeePaymentInput } from "@/server/validators/payment.schema";
import { requireLandlord } from "./auth.service";
import {
  convertNairaToKobo,
  initializeStandardPaystackTransaction,
  verifyPaystackTransaction,
} from "./paystack.service";

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function getTenuroAppFeeAmount() {
  const value = process.env.TENURO_GATEWAY_ADMIN_FEE_NAIRA;

  if (!value) {
    throw new AppError(
      "TENURO_APP_FEE_MISSING",
      "Tenuro app fee is not configured.",
      500,
    );
  }

  const fee = Number(value);

  if (!Number.isFinite(fee) || fee <= 0) {
    throw new AppError(
      "TENURO_APP_FEE_INVALID",
      "Tenuro app fee is not configured correctly.",
      500,
    );
  }

  return fee;
}

function createAppFeeReference() {
  return `tenuro_appfee_${crypto.randomUUID().replaceAll("-", "")}`;
}

function getLandlordPaymentEmail(params: {
  email: string | null;
  phoneNumber: string;
}) {
  if (params.email?.trim()) {
    return params.email.trim();
  }

  const sanitizedPhone = params.phoneNumber.replace(/\D/g, "");

  return `${sanitizedPhone}@payments.tenuro.local`;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function mapPaystackStatus(status: string) {
  if (status === "failed") {
    return "failed" as const;
  }

  if (status === "abandoned") {
    return "abandoned" as const;
  }

  return "failed" as const;
}

function assertAppFeeAmountMatches(params: {
  verifiedAmountKobo: number;
  expectedFeeAmount: number;
}) {
  const expectedKobo = convertNairaToKobo(params.expectedFeeAmount);
  const difference = Math.abs(params.verifiedAmountKobo - expectedKobo);

  if (difference >= 1) {
    throw new AppError(
      "APP_FEE_AMOUNT_MISMATCH",
      "App fee payment amount does not match the expected fee.",
      400,
    );
  }
}

export async function initializeManualRentAppFeePayment(
  input: InitializeAppFeePaymentInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const existingIntent = await getAppFeePaymentIntentByIdempotencyKey(
    supabase,
    {
      landlordId: landlord.id,
      idempotencyKey: input.idempotencyKey,
    },
  );

  if (existingIntent) {
    return {
      authorizationUrl: existingIntent.authorization_url,
      reference: existingIntent.paystack_reference,
    };
  }

  const rentPayment = await getRentPaymentById(supabase, input.rentPaymentId);

  if (rentPayment.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to pay app fee for this payment.",
      403,
    );
  }

  if (rentPayment.payment_method === "paystack_gateway") {
    throw new AppError(
      "APP_FEE_ALREADY_COLLECTED",
      "Tenuro fee was already collected through the tenant Paystack split.",
      400,
    );
  }

  if (rentPayment.status !== "posted") {
    throw new AppError(
      "RENT_PAYMENT_NOT_POSTED",
      "App fee can only be paid for a posted rent payment.",
      400,
    );
  }

  const feeAmount = getTenuroAppFeeAmount();
  const reference = createAppFeeReference();

  const metadata = {
    reason: "manual_rent_app_fee",
    landlord_id: landlord.id,
    tenant_id: rentPayment.tenant_id,
    tenancy_id: rentPayment.tenancy_id,
    rent_payment_id: rentPayment.id,
    rent_amount_naira: rentPayment.amount_paid,
    app_fee_naira: feeAmount,
    property_name:
      rentPayment.tenancies?.units?.properties?.property_name ?? null,
    unit_identifier: rentPayment.tenancies?.units?.unit_identifier ?? null,
    tenant_name: rentPayment.tenants?.full_name ?? null,
  };

  const initializedTransaction = await initializeStandardPaystackTransaction({
    email: getLandlordPaymentEmail({
      email: landlord.email,
      phoneNumber: landlord.phoneNumber,
    }),
    amountKobo: convertNairaToKobo(feeAmount),
    reference,
    callbackUrl: `${getAppBaseUrl()}/app-fees/verify?reference=${reference}`,
    currencyCode: "NGN",
    metadata,
  });

  const intent = await createAppFeePaymentIntent(supabase, {
    landlordId: landlord.id,
    tenancyId: rentPayment.tenancy_id,
    tenantId: rentPayment.tenant_id,
    rentPaymentId: rentPayment.id,
    paystackReference: initializedTransaction.reference,
    paystackAccessCode: initializedTransaction.access_code,
    authorizationUrl: initializedTransaction.authorization_url,
    feeAmount,
    currencyCode: "NGN",
    metadata,
    idempotencyKey: input.idempotencyKey,
  });

  return {
    authorizationUrl: intent.authorization_url,
    reference: intent.paystack_reference,
  };
}

export async function processVerifiedAppFeePaymentReference(reference: string) {
  const supabase = createSupabaseAdminClient();
  const intent = await getAppFeePaymentIntentByReference(supabase, reference);

  if (!intent) {
    throw new AppError(
      "APP_FEE_INTENT_NOT_FOUND",
      "App fee payment reference was not found.",
      404,
    );
  }

  if (intent.status === "paid") {
    return intent;
  }

  const verifiedTransaction = await verifyPaystackTransaction(reference);
  const verifiedPayload = toRecord(verifiedTransaction);

  if (verifiedTransaction.reference !== intent.paystack_reference) {
    throw new AppError(
      "APP_FEE_REFERENCE_MISMATCH",
      "App fee reference does not match the initialized payment.",
      400,
    );
  }

  if (verifiedTransaction.currency !== intent.currency_code) {
    throw new AppError(
      "APP_FEE_CURRENCY_MISMATCH",
      "App fee currency does not match the initialized payment.",
      400,
    );
  }

  if (verifiedTransaction.status !== "success") {
    return markAppFeePaymentIntentFailed(supabase, {
      intentId: intent.id,
      status: mapPaystackStatus(verifiedTransaction.status),
      reason: `Paystack transaction status: ${verifiedTransaction.status}`,
      verifiedPayload,
    });
  }

  assertAppFeeAmountMatches({
    verifiedAmountKobo: verifiedTransaction.amount,
    expectedFeeAmount: intent.fee_amount,
  });

  return markAppFeePaymentIntentPaid(supabase, {
    intentId: intent.id,
    paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
    verifiedPayload,
  });
}

export async function getCurrentLandlordAppFeePaymentVerification(
  reference: string,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const initialIntent = await getAppFeePaymentIntentByReference(
    supabase,
    reference,
  );

  if (!initialIntent) {
    return null;
  }

  if (initialIntent.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN_APP_FEE_VERIFY",
      "You do not have permission to view this app fee payment.",
      403,
    );
  }

  if (initialIntent.status === "initialized") {
    await processVerifiedAppFeePaymentReference(reference);
  }

  const refreshedIntent = await getAppFeePaymentIntentByReference(
    supabase,
    reference,
  );

  return refreshedIntent ?? initialIntent;
}
