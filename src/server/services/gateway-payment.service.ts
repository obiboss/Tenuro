import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import {
  calculateRentCollectionFee,
  RENT_COLLECTION_FEE_MODEL,
} from "@/server/constants/rent-collection-fees";
import { AppError } from "@/server/errors/app-error";
import { getActiveAgentPaystackAccount } from "@/server/repositories/agent-paystack.repository";
import { getAgentPropertyListingById } from "@/server/repositories/agent-property-listings.repository";
import {
  createGatewayPaymentIntent,
  getGatewayPaymentIntentByIdempotencyKey,
  getGatewayPaymentIntentByReference,
  getLatestGatewayPaymentIntentForTenancyPurpose,
} from "@/server/repositories/gateway-payment.repository";
import {
  assertGatewayRentPaymentAmount,
  getCanonicalTenancyBalance,
} from "@/server/services/tenancy-financial-integrity.service";
import { getPayableOutstandingBalance } from "@/server/utils/tenancy-balance";
import { getActiveLandlordPaystackAccount } from "@/server/repositories/landlord-paystack.repository";
import {
  getActiveLandlordTenancyCharges,
  sumActiveLandlordChargeAmount,
} from "@/server/repositories/landlord-tenancy-charges.repository";
import { createPaymentAllocations } from "@/server/repositories/payment-allocations.repository";
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
import {
  assertAgentPayoutVerified,
  assertLandlordPayoutVerified,
  getPaystackPayoutVerificationUiState,
} from "@/server/services/paystack-verification.service";
import { generateTenantActivationLinkSystem } from "@/server/services/tenant-activation.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { InitializeRentPaymentInput } from "@/server/validators/payment.schema";
import { requireLandlordPlatformOperator, requireTenant } from "./auth.service";
import { processVerifiedGatewayPaymentReference } from "./gateway-payment-webhook.service";
import {
  convertNairaToKobo,
  createAgentDealTransactionSplit,
  initializePaystackMultiSplitTransaction,
  initializePaystackTransaction,
} from "./paystack.service";
import { getTenantRentReceiptDownloadUrlByGatewayReference } from "./receipts.service";

const PAYMENT_LINK_EXPIRY_HOURS = 24;
const PAYMENT_PURPOSE_NEW_TENANT_FIRST_RENT = "new_tenant_first_rent";
const PAYMENT_PURPOSE_TENANT_DASHBOARD_RENT = "tenant_dashboard_rent";
const PAYMENT_PURPOSE_LANDLORD_PREPARED_RENT = "landlord_prepared_rent_payment";

type GatewayPaymentInitializerActorRole =
  | typeof AUDIT_ACTOR_ROLES.landlord
  | typeof AUDIT_ACTOR_ROLES.tenant
  | typeof AUDIT_ACTOR_ROLES.system;

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
  landlordChargesAmount: number;
  agentCommissionAmount: number;
  bopaServiceFeeAmount: number;
  totalAmount: number;
  paymentUrl: string;
  expiresAt: string;
}) {
  const expiryText = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(params.expiresAt));

  const chargeLines =
    params.landlordChargesAmount > 0
      ? [`Landlord charges: ${formatNairaAmount(params.landlordChargesAmount)}`]
      : [];

  const agentLines =
    params.agentCommissionAmount > 0
      ? [`Agent commission: ${formatNairaAmount(params.agentCommissionAmount)}`]
      : [];

  return [
    `Hello ${params.tenantName},`,
    "",
    `${params.landlordName} has prepared your rent payment link for ${params.unitName} at ${params.propertyName}.`,
    "",
    `Rent amount: ${formatNairaAmount(params.rentAmount)}`,
    ...chargeLines,
    ...agentLines,
    `BOPA Service Fee: ${formatNairaAmount(params.bopaServiceFeeAmount)}`,
    `Total payable: ${formatNairaAmount(params.totalAmount)}`,
    `Link expires: ${expiryText}`,
    "",
    "Please use this secure link to review the amount and continue to Paystack:",
    params.paymentUrl,
    "",
    "Your tenant account activation will only be available after your full payment is confirmed.",
  ].join("\n");
}

function createPaymentReference() {
  return `bopa_${crypto.randomUUID().replaceAll("-", "")}`;
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
    return `tenant-${sanitizedPhone}@boldverseproperty.com`;
  }

  return "payments@boldverseproperty.com";
}

function assertGatewayAmountStructure(params: {
  rentAmount: number;
  landlordChargesAmount: number;
  agentCommissionAmount: number;
  bopaServiceFeeAmount: number;
  landlordShareAmount: number;
  totalAmount: number;
}) {
  if (params.rentAmount <= 0) {
    throw new AppError(
      "RENT_AMOUNT_INVALID",
      "Rent amount must be greater than zero.",
      400,
    );
  }

  if (params.landlordChargesAmount < 0) {
    throw new AppError(
      "LANDLORD_CHARGES_INVALID",
      "Landlord charges cannot be negative.",
      500,
    );
  }

  if (params.agentCommissionAmount < 0) {
    throw new AppError(
      "AGENT_COMMISSION_INVALID",
      "Agent commission cannot be negative.",
      500,
    );
  }

  if (params.bopaServiceFeeAmount < 0) {
    throw new AppError(
      "BOPA_SERVICE_FEE_INVALID",
      "BOPA Service Fee cannot be negative.",
      500,
    );
  }

  if (
    params.landlordShareAmount !==
    params.rentAmount + params.landlordChargesAmount
  ) {
    throw new AppError(
      "LANDLORD_SHARE_MISMATCH",
      "Landlord share must equal rent plus landlord charges.",
      500,
    );
  }

  if (
    params.totalAmount !==
    params.landlordShareAmount +
      params.agentCommissionAmount +
      params.bopaServiceFeeAmount
  ) {
    throw new AppError(
      "GATEWAY_TOTAL_MISMATCH",
      "Payment total does not match landlord share, agent commission, and BOPA Service Fee.",
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

function readMetadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readMetadataArray(
  metadata: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  const value = metadata[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );
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

async function resolveReusablePaymentIntent(params: {
  tenancyId: string;
  landlordId: string;
  idempotencyKey: string;
  paymentPurpose: string;
}) {
  const supabase = createSupabaseAdminClient();

  const existingIdempotentIntent =
    await getGatewayPaymentIntentByIdempotencyKey(supabase, {
      landlordId: params.landlordId,
      idempotencyKey: params.idempotencyKey,
    });

  if (existingIdempotentIntent) {
    return existingIdempotentIntent;
  }

  return getLatestGatewayPaymentIntentForTenancyPurpose(supabase, {
    tenancyId: params.tenancyId,
    paymentPurpose: params.paymentPurpose,
    status: "initialized",
  });
}

function getReusableIntentAgentId(metadata: Record<string, unknown>) {
  const agentDeal = toRecord(metadata.agent_deal);
  const agentDealAgentId = readMetadataText(agentDeal, "agent_id");

  if (agentDealAgentId) {
    return agentDealAgentId;
  }

  const allocations = toRecord(metadata.allocations);
  const agentAllocation = toRecord(allocations.agent);

  return readMetadataText(agentAllocation, "agent_id");
}

async function assertReusableGatewayIntentPayoutsVerified(params: {
  supabase: SupabaseClient;
  metadata: Record<string, unknown>;
  agentPropertyListingId: string | null;
  invitedByAgentId: string | null;
}) {
  if (readMetadataNumber(params.metadata, "agent_commission_amount") <= 0) {
    return;
  }

  const agentId = getReusableIntentAgentId(params.metadata);

  if (agentId) {
    const agentPaystackAccount = await getActiveAgentPaystackAccount(
      params.supabase,
      agentId,
    );

    assertAgentPayoutVerified(agentPaystackAccount);
    return;
  }

  const agentDealAllocation = await resolveAgentDealPaymentAllocation({
    agentPropertyListingId: params.agentPropertyListingId,
    invitedByAgentId: params.invitedByAgentId,
  });

  if (agentDealAllocation?.isAgentCommissionPayable !== true) {
    assertAgentPayoutVerified(null);
  }
}

async function resolveAgentDealPaymentAllocation(params: {
  agentPropertyListingId: string | null;
  invitedByAgentId: string | null;
}) {
  if (!params.agentPropertyListingId || !params.invitedByAgentId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const listing = await getAgentPropertyListingById(
    supabase,
    params.agentPropertyListingId,
  );

  if (listing.status !== "converted") {
    return null;
  }

  if (listing.agent_id !== params.invitedByAgentId) {
    return null;
  }

  const commissionAmount = Number(listing.agent_commission_amount ?? 0);

  if (!Number.isFinite(commissionAmount) || commissionAmount <= 0) {
    return {
      listing,
      agentPaystackAccount: null,
      commissionAmount: 0,
      isAgentDeal: true,
      isAgentCommissionPayable: false,
    };
  }

  const agentPaystackAccount = await getActiveAgentPaystackAccount(
    supabase,
    listing.agent_id,
  );

  const verifiedAgentPaystackAccount =
    assertAgentPayoutVerified(agentPaystackAccount);

  return {
    listing,
    agentPaystackAccount: verifiedAgentPaystackAccount,
    commissionAmount,
    isAgentDeal: true,
    isAgentCommissionPayable: true,
  };
}

async function initializeGatewayPaymentForTenancy(params: {
  tenancyId: string;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
  idempotencyKey: string;
  paymentPurpose: string;
  auditDescription: string;
  actorProfileId: string | null;
  actorRole: GatewayPaymentInitializerActorRole;
  requireAcceptedAgreement: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const tenancy = await getTenancyPaymentContext(supabase, params.tenancyId);

  if (
    tenancy.tenancy_status !== "active" ||
    tenancy.agreement_live_at === null
  ) {
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

  const tenantPhone = normalisePhoneNumber(tenancy.tenants.phone_number);
  const propertyName =
    tenancy.units?.properties?.property_name ?? "your apartment";
  const unitName = tenancy.units?.unit_identifier ?? "your unit";
  const paystackAccount = await getActiveLandlordPaystackAccount(
    supabase,
    tenancy.landlord_id,
  );

  const verifiedPaystackAccount = assertLandlordPayoutVerified(paystackAccount);

  const reusableIntent = await resolveReusablePaymentIntent({
    tenancyId: tenancy.id,
    landlordId: tenancy.landlord_id,
    idempotencyKey: params.idempotencyKey,
    paymentPurpose: params.paymentPurpose,
  });

  if (reusableIntent) {
    const reusableExpiry = getEffectiveExpiry({
      expiresAt: reusableIntent.expires_at,
      createdAt: reusableIntent.created_at,
    });

    if (
      isPaymentIntentExpired({
        status: reusableIntent.status,
        expiresAt: reusableIntent.expires_at,
        createdAt: reusableIntent.created_at,
      })
    ) {
      await auditExpiredPaymentLinkOnce({
        landlordId: reusableIntent.landlord_id,
        tenantId: reusableIntent.tenant_id,
        tenancyId: reusableIntent.tenancy_id,
        intentId: reusableIntent.id,
        reference: reusableIntent.paystack_reference,
        expiresAt: reusableExpiry,
      });

      throw new AppError(
        "PAYMENT_LINK_EXPIRED",
        "This payment link has expired. Please prepare a new payment link.",
        410,
      );
    }

    const metadata = toRecord(reusableIntent.metadata);

    await assertReusableGatewayIntentPayoutsVerified({
      supabase,
      metadata,
      agentPropertyListingId: tenancy.tenants.agent_property_listing_id,
      invitedByAgentId: tenancy.tenants.invited_by_agent_id,
    });

    const tenantPaymentUrl = getTenantPaymentUrl(
      reusableIntent.paystack_reference,
    );
    const bopaServiceFeeAmount =
      readMetadataNumber(metadata, "bopa_service_fee_amount") ||
      Number(reusableIntent.tenuro_fee_amount);

    return {
      tenantId: tenancy.tenant_id,
      authorizationUrl: reusableIntent.authorization_url,
      accessCode: reusableIntent.paystack_access_code,
      reference: reusableIntent.paystack_reference,
      tenantPaymentUrl,
      tenantWhatsappNumber: tenantPhone.national,
      expiresAt: reusableExpiry,
      whatsappMessage: buildTenantPaymentMessage({
        tenantName: tenancy.tenants.full_name,
        landlordName: "Your landlord",
        propertyName,
        unitName,
        rentAmount: Number(reusableIntent.rent_amount),
        landlordChargesAmount: readMetadataNumber(
          metadata,
          "landlord_charges_amount",
        ),
        agentCommissionAmount: readMetadataNumber(
          metadata,
          "agent_commission_amount",
        ),
        bopaServiceFeeAmount,
        totalAmount: Number(reusableIntent.total_amount),
        paymentUrl: tenantPaymentUrl,
        expiresAt: reusableExpiry ?? reusableIntent.created_at,
      }),
    };
  }

  const landlordCharges = await getActiveLandlordTenancyCharges(supabase, {
    tenancyId: tenancy.id,
    landlordId: tenancy.landlord_id,
  });

  const rentAmount = params.amount;
  const landlordChargesAmount = sumActiveLandlordChargeAmount(landlordCharges);
  const rentCollectionFee = calculateRentCollectionFee({
    annualRentAmount: Number(tenancy.rent_amount),
    paymentAmount: rentAmount,
  });
  const bopaServiceFeeAmount = rentCollectionFee.feeAmount;
  const bopaServiceFeePercentage = rentCollectionFee.ratePercentage;
  const expiresAt = createPaymentLinkExpiry();

  const agentDealAllocation = await resolveAgentDealPaymentAllocation({
    agentPropertyListingId: tenancy.tenants.agent_property_listing_id,
    invitedByAgentId: tenancy.tenants.invited_by_agent_id,
  });

  const agentCommissionAmount = agentDealAllocation?.commissionAmount ?? 0;
  const landlordShareAmount = rentAmount + landlordChargesAmount;
  const totalAmount =
    landlordShareAmount + agentCommissionAmount + bopaServiceFeeAmount;

  assertGatewayAmountStructure({
    rentAmount,
    landlordChargesAmount,
    agentCommissionAmount,
    bopaServiceFeeAmount,
    landlordShareAmount,
    totalAmount,
  });

  const bopaServiceFeeKobo = convertNairaToKobo(bopaServiceFeeAmount);
  const totalAmountKobo = convertNairaToKobo(totalAmount);
  const reference = createPaymentReference();

  const shouldUseAgentMultiSplit =
    agentDealAllocation?.isAgentCommissionPayable === true &&
    agentDealAllocation.agentPaystackAccount !== null;

  const agentDealSplit = shouldUseAgentMultiSplit
    ? await createAgentDealTransactionSplit({
        name: `BOPA Agent Deal ${reference}`,
        landlordSubaccountCode:
          verifiedPaystackAccount.paystack_subaccount_code,
        landlordShareKobo: convertNairaToKobo(landlordShareAmount),
        agentSubaccountCode: assertAgentPayoutVerified(
          agentDealAllocation.agentPaystackAccount,
        ).paystack_subaccount_code,
        agentShareKobo: convertNairaToKobo(agentCommissionAmount),
        currencyCode: tenancy.currency_code,
      })
    : null;

  const landlordChargesSummary = landlordCharges.map((charge) => ({
    id: charge.id,
    charge_name: charge.charge_name,
    amount: Number(charge.amount),
    currency_code: charge.currency_code,
    is_refundable: charge.is_refundable,
    is_required_before_move_in: charge.is_required_before_move_in,
  }));

  const metadata = {
    tenancy_id: tenancy.id,
    tenant_id: tenancy.tenant_id,
    landlord_id: tenancy.landlord_id,
    expected_amount_naira: totalAmount,
    rent_amount_naira: rentAmount,
    landlord_charges_amount: landlordChargesAmount,
    agent_commission_amount: agentCommissionAmount,
    bopa_service_fee_amount: bopaServiceFeeAmount,
    bopa_service_fee_percentage: bopaServiceFeePercentage,
    fee_model: RENT_COLLECTION_FEE_MODEL,
    annual_rent_amount: rentCollectionFee.annualRentAmount,
    bopa_collection_fee_amount: rentCollectionFee.feeAmount,
    bopa_collection_fee_rate: rentCollectionFee.rate,
    bopa_collection_fee_percentage: rentCollectionFee.ratePercentage,
    bopa_collection_fee_tier: rentCollectionFee.tierLabel,
    tenuro_fee_naira: bopaServiceFeeAmount,
    landlord_share_amount: landlordShareAmount,
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
    landlord_charges: landlordChargesSummary,
    agent_deal: agentDealAllocation
      ? {
          is_agent_deal: agentDealAllocation.isAgentDeal,
          is_agent_commission_payable:
            agentDealAllocation.isAgentCommissionPayable,
          agent_id: agentDealAllocation.listing.agent_id,
          agent_property_listing_id: agentDealAllocation.listing.id,
          agent_commission_amount: agentCommissionAmount,
          agent_paystack_subaccount_code:
            agentDealAllocation.agentPaystackAccount
              ?.paystack_subaccount_code ?? null,
        }
      : null,
    allocations: {
      landlord: {
        amount: landlordShareAmount,
        rent_amount: rentAmount,
        landlord_charges_amount: landlordChargesAmount,
      },
      agent: {
        amount: agentCommissionAmount,
        agent_id: agentDealAllocation?.listing.agent_id ?? null,
        agent_property_listing_id: agentDealAllocation?.listing.id ?? null,
      },
      platform: {
        amount: bopaServiceFeeAmount,
        fee_type: "bopa_service_fee",
        fee_model: RENT_COLLECTION_FEE_MODEL,
        fee_rate: rentCollectionFee.rate,
        fee_percentage: bopaServiceFeePercentage,
        fee_tier: rentCollectionFee.tierLabel,
        fee_basis: "rent_amount_only",
      },
    },
    paystack_split: agentDealSplit
      ? {
          mode: "agent_deal_flat_split",
          split_code: agentDealSplit.split_code,
          split_id: agentDealSplit.id,
          landlord_subaccount: verifiedPaystackAccount.paystack_subaccount_code,
          landlord_share_kobo: convertNairaToKobo(landlordShareAmount),
          agent_subaccount:
            agentDealAllocation?.agentPaystackAccount
              ?.paystack_subaccount_code ?? null,
          agent_share_kobo: convertNairaToKobo(agentCommissionAmount),
          platform_remainder_kobo: bopaServiceFeeKobo,
          bearer: "account",
        }
      : {
          mode: "subaccount_bopa_service_fee",
          subaccount: verifiedPaystackAccount.paystack_subaccount_code,
          transaction_charge_kobo: bopaServiceFeeKobo,
          landlord_share_amount: landlordShareAmount,
          bearer: "subaccount",
        },
  };

  const initializedTransaction = agentDealSplit
    ? await initializePaystackMultiSplitTransaction({
        email: getTenantPaymentEmail({
          tenantEmail: tenancy.tenants.email,
          tenantPhoneNumber: tenancy.tenants.phone_number,
        }),
        amountKobo: totalAmountKobo,
        reference,
        callbackUrl: getTenantPaymentVerifyUrl(reference),
        splitCode: agentDealSplit.split_code,
        currencyCode: tenancy.currency_code,
        metadata,
      })
    : await initializePaystackTransaction({
        email: getTenantPaymentEmail({
          tenantEmail: tenancy.tenants.email,
          tenantPhoneNumber: tenancy.tenants.phone_number,
        }),
        amountKobo: totalAmountKobo,
        reference,
        callbackUrl: getTenantPaymentVerifyUrl(reference),
        subaccountCode: verifiedPaystackAccount.paystack_subaccount_code,
        transactionChargeKobo: bopaServiceFeeKobo,
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
    tenuroFeeAmount: bopaServiceFeeAmount,
    totalAmount,
    currencyCode: tenancy.currency_code,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    expiresAt,
    idempotencyKey: params.idempotencyKey,
    metadata,
  });

  await createPaymentAllocations(supabase, [
    {
      gatewayPaymentIntentId: intent.id,
      landlordId: tenancy.landlord_id,
      tenantId: tenancy.tenant_id,
      tenancyId: tenancy.id,
      recipientType: "landlord",
      recipientProfileId: tenancy.landlord_id,
      agentPropertyListingId: agentDealAllocation?.listing.id ?? null,
      amount: landlordShareAmount,
      currencyCode: tenancy.currency_code,
      metadata: {
        source: "gateway_payment_intent_initialized",
        payment_purpose: params.paymentPurpose,
        rent_amount: rentAmount,
        landlord_charges_amount: landlordChargesAmount,
        landlord_charges: landlordChargesSummary,
      },
    },
    ...(agentCommissionAmount > 0 && agentDealAllocation
      ? [
          {
            gatewayPaymentIntentId: intent.id,
            landlordId: tenancy.landlord_id,
            tenantId: tenancy.tenant_id,
            tenancyId: tenancy.id,
            recipientType: "agent" as const,
            recipientProfileId: agentDealAllocation.listing.agent_id,
            agentPropertyListingId: agentDealAllocation.listing.id,
            amount: agentCommissionAmount,
            currencyCode: tenancy.currency_code,
            metadata: {
              source: "gateway_payment_intent_initialized",
              payment_purpose: params.paymentPurpose,
              agent_paystack_subaccount_code:
                agentDealAllocation.agentPaystackAccount
                  ?.paystack_subaccount_code ?? null,
            },
          },
        ]
      : []),
    {
      gatewayPaymentIntentId: intent.id,
      landlordId: tenancy.landlord_id,
      tenantId: tenancy.tenant_id,
      tenancyId: tenancy.id,
      recipientType: "platform",
      recipientProfileId: null,
      agentPropertyListingId: agentDealAllocation?.listing.id ?? null,
      amount: bopaServiceFeeAmount,
      currencyCode: tenancy.currency_code,
      metadata: {
        source: "gateway_payment_intent_initialized",
        payment_purpose: params.paymentPurpose,
        fee_type: "bopa_service_fee",
        fee_model: RENT_COLLECTION_FEE_MODEL,
        fee_rate: rentCollectionFee.rate,
        fee_percentage: bopaServiceFeePercentage,
        fee_tier: rentCollectionFee.tierLabel,
        fee_basis: "rent_amount_only",
        annual_rent_amount: rentCollectionFee.annualRentAmount,
        rent_payment_amount: rentAmount,
      },
    },
  ]);

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
    description: params.auditDescription,
    metadata: {
      gateway_payment_intent_id: intent.id,
      paystack_reference: intent.paystack_reference,
      rent_amount: rentAmount,
      landlord_charges_amount: landlordChargesAmount,
      agent_commission_amount: agentCommissionAmount,
      bopa_service_fee_amount: bopaServiceFeeAmount,
      bopa_service_fee_percentage: bopaServiceFeePercentage,
      fee_model: RENT_COLLECTION_FEE_MODEL,
      annual_rent_amount: rentCollectionFee.annualRentAmount,
      bopa_collection_fee_rate: rentCollectionFee.rate,
      bopa_collection_fee_tier: rentCollectionFee.tierLabel,
      landlord_share_amount: landlordShareAmount,
      total_amount: totalAmount,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      expires_at: expiresAt,
      property_name: propertyName,
      unit_identifier: unitName,
      payment_purpose: params.paymentPurpose,
      landlord_charges: landlordChargesSummary,
      agent_deal: metadata.agent_deal,
      allocations: metadata.allocations,
      paystack_split: metadata.paystack_split,
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
      landlordChargesAmount,
      agentCommissionAmount,
      bopaServiceFeeAmount,
      totalAmount,
      paymentUrl: tenantPaymentUrl,
      expiresAt,
    }),
  };
}

export async function initializeRentPayment(input: InitializeRentPaymentInput) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyPaymentContext(supabase, input.tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to receive payment for this rental agreement.",
      403,
    );
  }

  const adminSupabase = createSupabaseAdminClient();
  const balance = await getCanonicalTenancyBalance(adminSupabase, tenancy.id);

  assertGatewayRentPaymentAmount({
    rentAmount: input.amount,
    outstandingBefore: balance.outstanding_balance,
  });

  return initializeGatewayPaymentForTenancy({
    tenancyId: input.tenancyId,
    amount: input.amount,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    idempotencyKey: input.idempotencyKey,
    paymentPurpose: PAYMENT_PURPOSE_LANDLORD_PREPARED_RENT,
    auditDescription: "Tenant rent payment link prepared for WhatsApp.",
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
    periodStart: null,
    periodEnd: null,
    idempotencyKey: createPaymentIdempotencyKey(),
    paymentPurpose: PAYMENT_PURPOSE_NEW_TENANT_FIRST_RENT,
    auditDescription:
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

  const balance = await getCanonicalTenancyBalance(supabase, tenancy.id);
  const payableOutstanding = getPayableOutstandingBalance(
    balance.outstanding_balance,
  );

  if (payableOutstanding <= 0) {
    throw new AppError(
      "NO_RENT_DUE",
      "There is no outstanding rent due for this tenancy.",
      400,
    );
  }

  assertGatewayRentPaymentAmount({
    rentAmount: payableOutstanding,
    outstandingBefore: balance.outstanding_balance,
  });

  return initializeGatewayPaymentForTenancy({
    tenancyId: tenancy.id,
    amount: payableOutstanding,
    periodStart: tenancy.current_period_start,
    periodEnd: tenancy.current_period_end,
    idempotencyKey,
    paymentPurpose: PAYMENT_PURPOSE_TENANT_DASHBOARD_RENT,
    auditDescription: "Tenant dashboard rent payment link prepared.",
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
    const intentForVerify = await getGatewayPaymentIntentByReference(
      supabase,
      params.reference,
    );

    if (
      intentForVerify &&
      (intentForVerify.status === "initialized" ||
        (intentForVerify.status === "paid" &&
          !intentForVerify.processed_payment_id))
    ) {
      try {
        await processVerifiedGatewayPaymentReference(params.reference, {
          replaySource: "verify_page",
        });
      } catch (error) {
        console.error("Public tenant payment verification failed:", error);
      }
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
  const landlordPayoutAccount = await getActiveLandlordPaystackAccount(
    supabase,
    intent.landlord_id,
  );
  const onlinePaymentAvailability = getPaystackPayoutVerificationUiState(
    landlordPayoutAccount,
    "tenant",
  );
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
    landlordChargesAmount: readMetadataNumber(
      metadata,
      "landlord_charges_amount",
    ),
    landlordCharges: readMetadataArray(metadata, "landlord_charges"),
    agentCommissionAmount: readMetadataNumber(
      metadata,
      "agent_commission_amount",
    ),
    landlordShareAmount: readMetadataNumber(metadata, "landlord_share_amount"),
    bopaServiceFeeAmount:
      readMetadataNumber(metadata, "bopa_service_fee_amount") ||
      Number(intent.tenuro_fee_amount),
    bopaServiceFeePercentage:
      readMetadataNumber(metadata, "bopa_service_fee_percentage") ||
      readMetadataNumber(metadata, "bopa_collection_fee_percentage"),
    tenuroFeeAmount: Number(intent.tenuro_fee_amount),
    totalAmount: Number(intent.total_amount),
    currencyCode: intent.currency_code,
    status: intent.status,
    paidAt: intent.paid_at,
    expiresAt,
    isExpired,
    onlinePaymentAvailability,
    propertyName: readMetadataText(metadata, "property_name"),
    unitIdentifier: readMetadataText(metadata, "unit_identifier"),
    periodStart: intent.period_start,
    periodEnd: intent.period_end,
    receiptDownloadUrl,
    activationUrl: activation?.activationUrl ?? null,
    activationExpiresAt: activation?.expiresAt ?? null,
  };
}
