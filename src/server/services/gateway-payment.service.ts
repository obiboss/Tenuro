import "server-only";

import crypto from "node:crypto";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getTenancyBalanceSummary } from "@/server/repositories/ledger.repository";
import {
  createGatewayPaymentIntent,
  getGatewayPaymentIntentByIdempotencyKey,
  getGatewayPaymentIntentByReference,
  getLatestGatewayPaymentIntentForTenancyPurpose,
} from "@/server/repositories/gateway-payment.repository";
import { getActiveLandlordPaystackAccount } from "@/server/repositories/landlord-paystack.repository";
import { getTenancyPaymentContext } from "@/server/repositories/payment-context.repository";
import {
  getActiveTenantTenancy,
  getTenantDashboardTenantByProfile,
} from "@/server/repositories/tenant-dashboard.repository";
import { getTenancyAgreementByTenancyId } from "@/server/repositories/tenancy-agreements.repository";
import {
  writeAuditLog,
  writeSystemAuditLog,
} from "@/server/services/audit-log.service";
import { generateTenantActivationLinkSystem } from "@/server/services/tenant-activation.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { InitializeRentPaymentInput } from "@/server/validators/payment.schema";
import { requireLandlord, requireTenant } from "./auth.service";
import { processVerifiedGatewayPaymentReference } from "./gateway-payment-webhook.service";
import {
  convertNairaToKobo,
  initializePaystackTransaction,
} from "./paystack.service";
import { getTenantRentReceiptDownloadUrlByGatewayReference } from "./receipts.service";

const PAYMENT_LINK_EXPIRY_HOURS = 24;
const PAYMENT_PURPOSE_NEW_TENANT_FIRST_RENT = "new_tenant_first_rent";
const PAYMENT_PURPOSE_TENANT_DASHBOARD_RENT = "tenant_dashboard_rent";

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function getTenantPaymentUrl(reference: string) {
  return `${getAppBaseUrl()}/t/pay/${reference}`;
}

function getTenantPaymentVerifyUrl(reference: string) {
  return `${getTenantPaymentUrl(reference)}?verify=1`;
}

function formatNairaAmount(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildTenantPaymentMessage(params: {
  tenantName: string;
  landlordName: string;
  propertyName: string;
  unitName: string;
  rentAmount: number;
  paymentUrl: string;
  expiresAt: string;
}) {
  const expiryText = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(params.expiresAt));

  return [
    `Hello ${params.tenantName},`,
    "",
    `${params.landlordName} has prepared your rent payment link for ${params.unitName} at ${params.propertyName}.`,
    "",
    `Rent amount: ${formatNairaAmount(params.rentAmount)}`,
    `Link expires: ${expiryText}`,
    "",
    "Please use this secure link to review the amount and continue to Paystack:",
    params.paymentUrl,
    "",
    "Your tenant account activation will only be available after your full payment is confirmed.",
  ].join("\n");
}

function getTenuroGatewayAdminFee() {
  const value = process.env.TENURO_GATEWAY_ADMIN_FEE_NAIRA;

  if (!value) {
    throw new AppError(
      "TENURO_GATEWAY_FEE_MISSING",
      "Gateway fee is not configured.",
      500,
    );
  }

  const fee = Number(value);

  if (!Number.isFinite(fee) || fee < 0) {
    throw new AppError(
      "TENURO_GATEWAY_FEE_INVALID",
      "Gateway fee is not configured correctly.",
      500,
    );
  }

  return fee;
}

function createPaymentReference() {
  return `tenuro_${crypto.randomUUID().replaceAll("-", "")}`;
}

function createPaymentIdempotencyKey() {
  return crypto.randomUUID();
}

function createPaymentLinkExpiry() {
  return new Date(
    Date.now() + PAYMENT_LINK_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

function getFallbackExpiryFromCreatedAt(createdAt: string) {
  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  return new Date(
    createdDate.getTime() + PAYMENT_LINK_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

function getEffectiveExpiry(params: {
  expiresAt: string | null;
  createdAt: string;
}) {
  return params.expiresAt ?? getFallbackExpiryFromCreatedAt(params.createdAt);
}

function isPaymentIntentExpired(params: {
  status: string;
  expiresAt: string | null;
  createdAt: string;
}) {
  if (params.status === "paid") {
    return false;
  }

  const expiry = getEffectiveExpiry({
    expiresAt: params.expiresAt,
    createdAt: params.createdAt,
  });

  if (!expiry) {
    return false;
  }

  return new Date(expiry).getTime() <= Date.now();
}

function getTenantPaymentEmail(params: {
  tenantEmail: string | null;
  tenantPhoneNumber: string;
}) {
  const email = params.tenantEmail?.trim().toLowerCase();

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return email;
  }

  const sanitizedPhone = params.tenantPhoneNumber.replace(/\D/g, "");

  if (sanitizedPhone.length >= 7) {
    return `tenant-${sanitizedPhone}@tenuro.app`;
  }

  return "payments@tenuro.app";
}

function assertGatewayAmountStructure(params: {
  rentAmount: number;
  tenuroFeeAmount: number;
  totalAmount: number;
}) {
  if (params.rentAmount <= 0) {
    throw new AppError(
      "RENT_AMOUNT_INVALID",
      "Rent amount must be greater than zero.",
      400,
    );
  }

  if (params.tenuroFeeAmount < 0) {
    throw new AppError(
      "GATEWAY_FEE_INVALID",
      "Gateway fee cannot be negative.",
      500,
    );
  }

  if (params.totalAmount !== params.rentAmount + params.tenuroFeeAmount) {
    throw new AppError(
      "GATEWAY_TOTAL_MISMATCH",
      "Payment total does not match rent plus gateway fee.",
      500,
    );
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readMetadataText(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function readMetadataBoolean(
  metadata: Record<string, unknown>,
  key: string,
): boolean {
  return metadata[key] === true;
}

async function auditExpiredPaymentLinkOnce(params: {
  landlordId: string;
  tenantId: string;
  tenancyId: string;
  intentId: string;
  reference: string;
  expiresAt: string | null;
}) {
  await writeSystemAuditLog({
    landlordId: params.landlordId,
    tenantId: params.tenantId,
    tenancyId: params.tenancyId,
    eventType: AUDIT_EVENT_TYPES.paymentLinkExpired,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: params.intentId,
    description: "Tenant rent payment link expired.",
    metadata: {
      gateway_payment_intent_id: params.intentId,
      paystack_reference: params.reference,
      expires_at: params.expiresAt,
    },
  });
}

type GatewayPaymentInitializerActorRole =
  | typeof AUDIT_ACTOR_ROLES.landlord
  | typeof AUDIT_ACTOR_ROLES.tenant
  | typeof AUDIT_ACTOR_ROLES.system;

async function initializeGatewayPaymentForTenancy(params: {
  tenancyId: string;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
  idempotencyKey: string;
  paymentPurpose: string;
  sendWhatsappAuditDescription: string;
  actorProfileId: string | null;
  actorRole: GatewayPaymentInitializerActorRole;
  requireAcceptedAgreement: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const tenancy = await getTenancyPaymentContext(supabase, params.tenancyId);

  if (tenancy.status !== "active") {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Payment can only be made for an active rental agreement.",
      400,
    );
  }

  if (!tenancy.tenants) {
    throw new AppError(
      "TENANT_NOT_FOUND",
      "We could not find the tenant for this payment.",
      404,
    );
  }

  if (params.requireAcceptedAgreement) {
    const agreement = await getTenancyAgreementByTenancyId(
      supabase,
      tenancy.id,
    );

    if (agreement?.document_status !== "accepted") {
      throw new AppError(
        "AGREEMENT_NOT_ACCEPTED",
        "The tenant must accept the tenancy agreement before rent payment can continue.",
        400,
      );
    }
  }

  const existingIdempotentIntent =
    await getGatewayPaymentIntentByIdempotencyKey(supabase, {
      landlordId: tenancy.landlord_id,
      idempotencyKey: params.idempotencyKey,
    });

  if (existingIdempotentIntent) {
    if (
      isPaymentIntentExpired({
        status: existingIdempotentIntent.status,
        expiresAt: existingIdempotentIntent.expires_at,
        createdAt: existingIdempotentIntent.created_at,
      })
    ) {
      const existingExpiry = getEffectiveExpiry({
        expiresAt: existingIdempotentIntent.expires_at,
        createdAt: existingIdempotentIntent.created_at,
      });

      await auditExpiredPaymentLinkOnce({
        landlordId: existingIdempotentIntent.landlord_id,
        tenantId: existingIdempotentIntent.tenant_id,
        tenancyId: existingIdempotentIntent.tenancy_id,
        intentId: existingIdempotentIntent.id,
        reference: existingIdempotentIntent.paystack_reference,
        expiresAt: existingExpiry,
      });

      throw new AppError(
        "PAYMENT_LINK_EXPIRED",
        "This payment link has expired. Please prepare a new payment link.",
        410,
      );
    }

    const tenantPaymentUrl = getTenantPaymentUrl(
      existingIdempotentIntent.paystack_reference,
    );

    const tenantPhone = normalisePhoneNumber(tenancy.tenants.phone_number);

    const existingExpiry = getEffectiveExpiry({
      expiresAt: existingIdempotentIntent.expires_at,
      createdAt: existingIdempotentIntent.created_at,
    });

    return {
      tenantId: tenancy.tenant_id,
      authorizationUrl: existingIdempotentIntent.authorization_url,
      accessCode: existingIdempotentIntent.paystack_access_code,
      reference: existingIdempotentIntent.paystack_reference,
      tenantPaymentUrl,
      tenantWhatsappNumber: tenantPhone.national,
      expiresAt: existingExpiry,
      whatsappMessage: buildTenantPaymentMessage({
        tenantName: tenancy.tenants.full_name,
        landlordName: "Your landlord",
        propertyName:
          tenancy.units?.properties?.property_name ?? "your apartment",
        unitName: tenancy.units?.unit_identifier ?? "your unit",
        rentAmount: Number(existingIdempotentIntent.rent_amount),
        paymentUrl: tenantPaymentUrl,
        expiresAt: existingExpiry ?? existingIdempotentIntent.created_at,
      }),
    };
  }

  const latestPurposeIntent =
    await getLatestGatewayPaymentIntentForTenancyPurpose(supabase, {
      tenancyId: tenancy.id,
      paymentPurpose: params.paymentPurpose,
    });

  if (
    latestPurposeIntent &&
    !isPaymentIntentExpired({
      status: latestPurposeIntent.status,
      expiresAt: latestPurposeIntent.expires_at,
      createdAt: latestPurposeIntent.created_at,
    })
  ) {
    const tenantPaymentUrl = getTenantPaymentUrl(
      latestPurposeIntent.paystack_reference,
    );
    const tenantPhone = normalisePhoneNumber(tenancy.tenants.phone_number);
    const expiry = getEffectiveExpiry({
      expiresAt: latestPurposeIntent.expires_at,
      createdAt: latestPurposeIntent.created_at,
    });

    return {
      tenantId: tenancy.tenant_id,
      authorizationUrl: latestPurposeIntent.authorization_url,
      accessCode: latestPurposeIntent.paystack_access_code,
      reference: latestPurposeIntent.paystack_reference,
      tenantPaymentUrl,
      tenantWhatsappNumber: tenantPhone.national,
      expiresAt: expiry,
      whatsappMessage: buildTenantPaymentMessage({
        tenantName: tenancy.tenants.full_name,
        landlordName: "Your landlord",
        propertyName:
          tenancy.units?.properties?.property_name ?? "your apartment",
        unitName: tenancy.units?.unit_identifier ?? "your unit",
        rentAmount: Number(latestPurposeIntent.rent_amount),
        paymentUrl: tenantPaymentUrl,
        expiresAt: expiry ?? latestPurposeIntent.created_at,
      }),
    };
  }

  const paystackAccount = await getActiveLandlordPaystackAccount(
    supabase,
    tenancy.landlord_id,
  );

  if (!paystackAccount) {
    throw new AppError(
      "BANK_ACCOUNT_REQUIRED",
      "The landlord payout account is not ready for online rent payment.",
      400,
    );
  }

  const tenantPhone = normalisePhoneNumber(tenancy.tenants.phone_number);
  const propertyName =
    tenancy.units?.properties?.property_name ?? "your apartment";
  const unitName = tenancy.units?.unit_identifier ?? "your unit";
  const rentAmount = params.amount;
  const tenuroFeeAmount = getTenuroGatewayAdminFee();
  const totalAmount = rentAmount + tenuroFeeAmount;
  const expiresAt = createPaymentLinkExpiry();

  assertGatewayAmountStructure({
    rentAmount,
    tenuroFeeAmount,
    totalAmount,
  });

  const tenuroFeeKobo = convertNairaToKobo(tenuroFeeAmount);
  const totalAmountKobo = convertNairaToKobo(totalAmount);
  const reference = createPaymentReference();

  const metadata = {
    tenancy_id: tenancy.id,
    tenant_id: tenancy.tenant_id,
    landlord_id: tenancy.landlord_id,
    expected_amount_naira: rentAmount,
    tenuro_fee_naira: tenuroFeeAmount,
    total_amount_naira: totalAmount,
    currency_code: tenancy.currency_code,
    period_start: params.periodStart,
    period_end: params.periodEnd,
    payment_link_expires_at: expiresAt,
    idempotency_key: params.idempotencyKey,
    property_name: propertyName,
    unit_identifier: unitName,
    payment_purpose: params.paymentPurpose,
    automatic_after_agreement:
      params.paymentPurpose === PAYMENT_PURPOSE_NEW_TENANT_FIRST_RENT,
    paystack_split: {
      mode: "subaccount_flat_fee",
      subaccount: paystackAccount.paystack_subaccount_code,
      transaction_charge_kobo: tenuroFeeKobo,
      bearer: "subaccount",
    },
  };

  const initializedTransaction = await initializePaystackTransaction({
    email: getTenantPaymentEmail({
      tenantEmail: tenancy.tenants.email,
      tenantPhoneNumber: tenancy.tenants.phone_number,
    }),
    amountKobo: totalAmountKobo,
    reference,
    callbackUrl: getTenantPaymentVerifyUrl(reference),
    subaccountCode: paystackAccount.paystack_subaccount_code,
    transactionChargeKobo: tenuroFeeKobo,
    currencyCode: tenancy.currency_code,
    metadata,
  });

  const intent = await createGatewayPaymentIntent(supabase, {
    landlordId: tenancy.landlord_id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    paystackReference: initializedTransaction.reference,
    paystackAccessCode: initializedTransaction.access_code,
    authorizationUrl: initializedTransaction.authorization_url,
    rentAmount,
    tenuroFeeAmount,
    totalAmount,
    currencyCode: tenancy.currency_code,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    expiresAt,
    idempotencyKey: params.idempotencyKey,
    metadata,
  });

  const tenantPaymentUrl = getTenantPaymentUrl(intent.paystack_reference);

  await writeAuditLog({
    landlordId: tenancy.landlord_id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    actorProfileId: params.actorProfileId,
    actorRole: params.actorRole,
    eventType: AUDIT_EVENT_TYPES.paymentLinkSent,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: intent.id,
    description: params.sendWhatsappAuditDescription,
    metadata: {
      gateway_payment_intent_id: intent.id,
      paystack_reference: intent.paystack_reference,
      rent_amount: rentAmount,
      tenuro_fee_amount: tenuroFeeAmount,
      total_amount: totalAmount,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      expires_at: expiresAt,
      property_name: propertyName,
      unit_identifier: unitName,
      payment_purpose: params.paymentPurpose,
    },
  });

  return {
    tenantId: tenancy.tenant_id,
    authorizationUrl: intent.authorization_url,
    accessCode: intent.paystack_access_code,
    reference: intent.paystack_reference,
    tenantPaymentUrl,
    tenantWhatsappNumber: tenantPhone.national,
    expiresAt,
    whatsappMessage: buildTenantPaymentMessage({
      tenantName: tenancy.tenants.full_name,
      landlordName: "Your landlord",
      propertyName,
      unitName,
      rentAmount,
      paymentUrl: tenantPaymentUrl,
      expiresAt,
    }),
  };
}

export async function initializeRentPayment(input: InitializeRentPaymentInput) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyPaymentContext(supabase, input.tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to receive payment for this rental agreement.",
      403,
    );
  }

  return initializeGatewayPaymentForTenancy({
    tenancyId: input.tenancyId,
    amount: input.amount,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    idempotencyKey: input.idempotencyKey,
    paymentPurpose: "landlord_prepared_rent_payment",
    sendWhatsappAuditDescription:
      "Tenant rent payment link prepared for WhatsApp.",
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    requireAcceptedAgreement: true,
  });
}

export async function initializeFirstRentPaymentAfterAgreementAcceptance(params: {
  tenancyId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const tenancy = await getTenancyPaymentContext(supabase, params.tenancyId);

  const agreement = await getTenancyAgreementByTenancyId(
    supabase,
    params.tenancyId,
  );

  if (agreement?.document_status !== "accepted") {
    throw new AppError(
      "AGREEMENT_NOT_ACCEPTED",
      "Accept the tenancy agreement before making the first rent payment.",
      400,
    );
  }

  return initializeGatewayPaymentForTenancy({
    tenancyId: params.tenancyId,
    amount: Number(tenancy.rent_amount),
    periodStart: tenancy.id ? null : null,
    periodEnd: null,
    idempotencyKey: createPaymentIdempotencyKey(),
    paymentPurpose: PAYMENT_PURPOSE_NEW_TENANT_FIRST_RENT,
    sendWhatsappAuditDescription:
      "First rent payment link automatically prepared after agreement acceptance.",
    actorProfileId: null,
    actorRole: AUDIT_ACTOR_ROLES.system,
    requireAcceptedAgreement: true,
  });
}

export async function initializeTenantDashboardRentPayment(params: {
  idempotencyKey: string;
}) {
  const idempotencyKey = params.idempotencyKey.trim();

  if (!idempotencyKey) {
    throw new AppError(
      "IDEMPOTENCY_KEY_REQUIRED",
      "Payment request could not be prepared. Please refresh and try again.",
      400,
    );
  }

  const user = await requireTenant();
  const supabase = createSupabaseAdminClient();

  const tenant = await getTenantDashboardTenantByProfile(supabase, {
    profileId: user.id,
    phoneNumber: user.phoneNumber,
  });

  if (!tenant) {
    throw new AppError(
      "TENANT_RECORD_NOT_FOUND",
      "We could not find your tenant record.",
      404,
    );
  }

  const tenancy = await getActiveTenantTenancy(supabase, tenant.id);

  if (!tenancy) {
    throw new AppError(
      "ACTIVE_TENANCY_NOT_FOUND",
      "You do not have an active tenancy to pay for.",
      404,
    );
  }

  const balance = await getTenancyBalanceSummary(supabase, tenancy.id);

  if (Number(balance.outstanding_balance) <= 0) {
    throw new AppError(
      "NO_RENT_DUE",
      "There is no outstanding rent due for this tenancy.",
      400,
    );
  }

  return initializeGatewayPaymentForTenancy({
    tenancyId: tenancy.id,
    amount: Number(balance.outstanding_balance),
    periodStart: tenancy.current_period_start,
    periodEnd: tenancy.current_period_end,
    idempotencyKey,
    paymentPurpose: PAYMENT_PURPOSE_TENANT_DASHBOARD_RENT,
    sendWhatsappAuditDescription:
      "Tenant dashboard rent payment link prepared.",
    actorProfileId: user.id,
    actorRole: AUDIT_ACTOR_ROLES.tenant,
    requireAcceptedAgreement: true,
  });
}

export async function getPublicTenantPaymentCheckout(params: {
  reference: string;
  verify?: boolean;
}) {
  const supabase = createSupabaseAdminClient();

  if (params.verify) {
    try {
      await processVerifiedGatewayPaymentReference(params.reference);
    } catch (error) {
      console.error("Public tenant payment verification failed:", error);
    }
  }

  const intent = await getGatewayPaymentIntentByReference(
    supabase,
    params.reference,
  );

  if (!intent) {
    return null;
  }

  const metadata = toRecord(intent.metadata);
  const expiresAt = getEffectiveExpiry({
    expiresAt: intent.expires_at,
    createdAt: intent.created_at,
  });
  const isExpired = isPaymentIntentExpired({
    status: intent.status,
    expiresAt: intent.expires_at,
    createdAt: intent.created_at,
  });

  if (isExpired) {
    await auditExpiredPaymentLinkOnce({
      landlordId: intent.landlord_id,
      tenantId: intent.tenant_id,
      tenancyId: intent.tenancy_id,
      intentId: intent.id,
      reference: intent.paystack_reference,
      expiresAt,
    });
  }

  const receiptDownloadUrl =
    intent.status === "paid"
      ? await getTenantRentReceiptDownloadUrlByGatewayReference(
          intent.paystack_reference,
        )
      : null;

  const activation =
    intent.status === "paid" &&
    readMetadataBoolean(metadata, "automatic_after_agreement")
      ? await generateTenantActivationLinkSystem(intent.tenant_id)
      : null;

  return {
    id: intent.id,
    reference: intent.paystack_reference,
    authorizationUrl: intent.authorization_url,
    rentAmount: Number(intent.rent_amount),
    tenuroFeeAmount: Number(intent.tenuro_fee_amount),
    totalAmount: Number(intent.total_amount),
    currencyCode: intent.currency_code,
    status: intent.status,
    paidAt: intent.paid_at,
    expiresAt,
    isExpired,
    propertyName: readMetadataText(metadata, "property_name"),
    unitIdentifier: readMetadataText(metadata, "unit_identifier"),
    periodStart: intent.period_start,
    periodEnd: intent.period_end,
    receiptDownloadUrl,
    activationUrl: activation?.activationUrl ?? null,
    activationExpiresAt: activation?.expiresAt ?? null,
  };
}
