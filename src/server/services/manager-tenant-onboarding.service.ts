import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateManagerPaymentBreakdown,
  roundMoney,
} from "@/lib/manager-automation";
import { AppError } from "@/server/errors/app-error";
import {
  createManagerTenant as createManagerTenantRecord,
  getManagerOrganizationForCurrentUser,
  getManagerPropertyById,
  getManagerUnitById,
  hasCurrentManagerTenantForUnit,
} from "@/server/repositories/manager.repository";
import {
  acceptManagerTenantAgreement,
  cancelManagerOnboardingAfterAgreementDecline,
  createManagerTenantAgreementDocument,
  createManagerTenantOnboardingRequest,
  deactivateManagerProspectiveTenant,
  getManagerTenantAgreementByTokenHash,
  getManagerTenantOnboardingRequestById,
  getManagerTenantOnboardingRequestByTokenHash,
  markManagerOnboardingAgreementAccepted,
  markManagerOnboardingPaymentInitialized,
  submitManagerTenantOnboardingRequest,
  updateManagerTenantOnboardingRequestReviewed,
  updateManagerTenantOnboardingRequestToken,
  updateManagerUnitStatusDirect,
  voidManagerTenantAgreement,
  type ManagerTenantAgreementDocumentRow,
  type ManagerTenantOnboardingRequestRow,
} from "@/server/repositories/manager-tenant-onboarding.repository";
import {
  expireManagerFirstRentPaymentRequestsForAgreement,
  expireManagerNewTenantPaymentRequests,
} from "@/server/repositories/manager-paystack.repository";
import { getActiveManagerPaystackAccount } from "@/server/repositories/manager-paystack-accounts.repository";
import { buildManagerTenancyAgreementTemplate } from "@/server/services/manager-tenancy-agreement-template.service";
import {
  convertNairaToKobo,
  initializePaystackTransaction,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type {
  AcceptManagerTenantAgreementInput,
  ApproveManagerTenantOnboardingRequestInput,
  CreateManagerTenantOnboardingRequestInput,
  DeclineManagerTenantAgreementInput,
  ManagerOnboardingPaymentFrequency,
  RejectManagerTenantOnboardingRequestInput,
  ResendManagerFirstRentPaymentLinkInput,
  ResendManagerTenantOnboardingLinkInput,
  SubmitManagerTenantOnboardingRequestInput,
} from "@/server/validators/manager-tenant-onboarding.schema";

type ManagerProfileRow = {
  id: string;
  role: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  is_active: boolean;
};

type ManagerAcceptedAgreementPaymentRow = {
  id: string;
  document_status: "accepted";
  finalized_by_profile_id: string | null;
  tenant_snapshot: Record<string, unknown>;
  tenancy_snapshot: Record<string, unknown>;
};

type ManagerTenantPaymentBreakdownResult = {
  currencyCode: "NGN";
  rentAmount: number;
  bopaPlatformFee: number;
  paystackCharge: number;
  otherCharges: number;
  managerCommission: number;
  landlordShare: number;
  totalPayable: number;
  collectionMode: "manager_collects";
  paystackChargeBearer: "tenant" | "landlord" | "manager" | "bopa";
};

const OPEN_UNIT_REQUEST_STATUSES = [
  "pending",
  "submitted",
  "agreement_sent",
  "agreement_accepted",
  "payment_initialized",
] as const;

function createSecureToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getExpiryDateFromHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BOPA_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!configuredUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return configuredUrl.replace(/\/$/, "");
}

function nullableText(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getManagerTenantOnboardingUrl(token: string) {
  return `${getAppBaseUrl()}/m/tenant-onboarding/${encodeURIComponent(token)}`;
}

function getManagerAgreementUrl(token: string) {
  return `${getAppBaseUrl()}/m/agreement/${encodeURIComponent(token)}`;
}

function getManagerPaystackCallbackUrl(reference: string) {
  return `${getAppBaseUrl()}/pay/manager/callback?reference=${encodeURIComponent(
    reference,
  )}`;
}

function generatePaystackReference() {
  return `BPM-${crypto.randomUUID().replaceAll("-", "").slice(0, 22).toUpperCase()}`;
}

function generatePaymentToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getFrequencyMonths(frequency: ManagerOnboardingPaymentFrequency) {
  const months: Record<ManagerOnboardingPaymentFrequency, number> = {
    monthly: 1,
    quarterly: 3,
    biannual: 6,
    annual: 12,
  };

  return months[frequency];
}

function formatDateOnly(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayDateOnly() {
  const now = new Date();

  return formatDateOnly(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
}

function compareDateOnly(first: string, second: string) {
  return first.localeCompare(second);
}

function addMonthsToDateOnly(dateValue: string, monthsToAdd: number) {
  const [yearValue, monthValue, dayValue] = dateValue.split("-").map(Number);

  if (!yearValue || !monthValue || !dayValue) {
    throw new AppError("INVALID_DATE", "Invalid move-in date.", 400);
  }

  const totalMonthIndex = monthValue - 1 + monthsToAdd;
  const targetYear = yearValue + Math.floor(totalMonthIndex / 12);
  const targetMonthIndex = ((totalMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonthIndex + 1, 0),
  ).getUTCDate();

  const targetDay = Math.min(dayValue, lastDayOfTargetMonth);

  return formatDateOnly(
    new Date(Date.UTC(targetYear, targetMonthIndex, targetDay)),
  );
}

function calculateFirstNextRentDueDate(params: {
  moveInDate: string;
  paymentFrequency: ManagerOnboardingPaymentFrequency;
}) {
  return addMonthsToDateOnly(
    params.moveInDate,
    getFrequencyMonths(params.paymentFrequency),
  );
}

function calculateCurrentNextRentDueDate(params: {
  moveInDate: string;
  paymentFrequency: ManagerOnboardingPaymentFrequency;
  referenceDate?: string;
}) {
  const frequencyMonths = getFrequencyMonths(params.paymentFrequency);
  const referenceDate = params.referenceDate ?? todayDateOnly();
  let dueDate = addMonthsToDateOnly(params.moveInDate, frequencyMonths);

  while (compareDateOnly(dueDate, referenceDate) < 0) {
    dueDate = addMonthsToDateOnly(dueDate, frequencyMonths);
  }

  return dueDate;
}

function calculateManagerOnboardingNextRentDueDate(params: {
  onboardingType: ManagerTenantOnboardingRequestRow["onboarding_type"];
  moveInDate: string;
  paymentFrequency: ManagerOnboardingPaymentFrequency;
}) {
  if (params.onboardingType === "new_incoming_tenant") {
    return calculateFirstNextRentDueDate({
      moveInDate: params.moveInDate,
      paymentFrequency: params.paymentFrequency,
    });
  }

  return calculateCurrentNextRentDueDate({
    moveInDate: params.moveInDate,
    paymentFrequency: params.paymentFrequency,
  });
}

function assertNewIncomingMoveInDate(params: {
  onboardingType: ManagerTenantOnboardingRequestRow["onboarding_type"];
  moveInDate: string;
}) {
  if (params.onboardingType !== "new_incoming_tenant") {
    return;
  }

  if (compareDateOnly(params.moveInDate, todayDateOnly()) < 0) {
    throw new AppError(
      "MANAGER_MOVE_IN_DATE_IN_PAST",
      "Choose today or a future move-in date.",
      400,
    );
  }
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

function buildManagerTenantPaymentBreakdownResult(params: {
  rentAmount: number;
  bopaPlatformFee: number;
  paystackCharge: number;
  managerCommission: number;
  landlordShare: number;
  paystackChargeBearer: "tenant" | "landlord" | "manager" | "bopa";
}): ManagerTenantPaymentBreakdownResult {
  return {
    currencyCode: "NGN",
    rentAmount: roundMoney(params.rentAmount),
    bopaPlatformFee: roundMoney(params.bopaPlatformFee),
    paystackCharge: roundMoney(params.paystackCharge),
    otherCharges: 0,
    managerCommission: roundMoney(params.managerCommission),
    landlordShare: roundMoney(params.landlordShare),
    totalPayable: roundMoney(params.rentAmount),
    collectionMode: "manager_collects",
    paystackChargeBearer: params.paystackChargeBearer,
  };
}

function getSnapshotNullableText(
  snapshot: Record<string, unknown>,
  key: string,
) {
  const value = snapshot[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getSnapshotNumber(
  snapshot: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const value = snapshot[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function formatDateTimeForMessage(value: string | null) {
  if (!value) {
    return "within 24 hours";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function buildTenantDetailMessage(params: {
  tenantName: string;
  organizationName: string;
  propertyName: string;
  unitLabel: string;
  claimUrl: string;
}) {
  return [
    `Hello ${params.tenantName},`,
    "",
    `${params.organizationName} has invited you to confirm your tenant details for ${params.unitLabel} at ${params.propertyName} on BOPA Manager.`,
    "",
    "Please use this secure link to submit your details:",
    params.claimUrl,
  ].join("\n");
}

function buildAgreementMessage(params: {
  tenantName: string;
  organizationName: string;
  propertyName: string;
  unitLabel: string;
  agreementUrl: string;
}) {
  return [
    `Hello ${params.tenantName},`,
    "",
    `${params.organizationName} has prepared your tenancy agreement for ${params.unitLabel} at ${params.propertyName}.`,
    "",
    "Please review and accept it here:",
    params.agreementUrl,
    "",
    "After acceptance, your payment summary will appear before secure payment.",
  ].join("\n");
}

function buildFirstRentPaymentMessage(params: {
  tenantName: string;
  organizationName: string;
  propertyName: string;
  unitLabel: string;
  amount: number;
  paymentUrl: string;
  expiresAt: string | null;
}) {
  return [
    `Hello ${params.tenantName},`,
    "",
    `${params.organizationName} has prepared your first rent payment for ${params.unitLabel} at ${params.propertyName}.`,
    "",
    `Amount: ${formatNaira(params.amount)}`,
    `Please pay before: ${formatDateTimeForMessage(params.expiresAt)}`,
    "",
    params.paymentUrl,
  ].join("\n");
}

function resolveEmail(params: {
  tenantEmail: string | null;
  tenantPhone: string;
  organizationEmail: string | null;
}) {
  const tenantEmail = params.tenantEmail?.trim().toLowerCase();

  if (tenantEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
    return tenantEmail;
  }

  const organizationEmail = params.organizationEmail?.trim().toLowerCase();

  if (
    organizationEmail &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizationEmail)
  ) {
    return organizationEmail;
  }

  const phone = params.tenantPhone.replace(/\D/g, "");

  return phone.length >= 7
    ? `manager-tenant-${phone}@boldverseproperty.com`
    : "payments@boldverseproperty.com";
}

async function getVerifiedManagerPaystackAccount(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const managerAccount = await getActiveManagerPaystackAccount(
    supabase,
    organizationId,
  );

  if (!managerAccount || managerAccount.verification_status !== "verified") {
    throw new AppError(
      "MANAGER_PAYOUT_ACCOUNT_REQUIRED",
      "Set up and verify the manager payout account before creating rent payment links.",
      400,
    );
  }

  return managerAccount;
}

async function getCurrentManagerProfile() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AppError("MANAGER_AUTH_REQUIRED", "Please sign in.", 401);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email, is_active")
    .eq("id", user.id)
    .maybeSingle<ManagerProfileRow>();

  if (error) {
    throw error;
  }

  if (!profile || !profile.is_active || profile.role !== "manager") {
    throw new AppError(
      "MANAGER_ROLE_REQUIRED",
      "This action is only available to BOPA Manager accounts.",
      403,
    );
  }

  return {
    supabase,
    profile,
  };
}

async function requireManagerOrganization() {
  const { supabase, profile } = await getCurrentManagerProfile();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    profile.id,
  );

  if (!organization || organization.status !== "active") {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Create an active BOPA Manager organization before continuing.",
      403,
    );
  }

  return {
    supabase,
    profile,
    organization,
  };
}

function assertPublicRequestUsable(request: ManagerTenantOnboardingRequestRow) {
  if (new Date(request.token_expires_at).getTime() < Date.now()) {
    throw new AppError(
      "MANAGER_TENANT_LINK_EXPIRED",
      "This tenant detail link has expired. Please ask the property manager for a new link.",
      410,
    );
  }

  if (request.status !== "pending") {
    throw new AppError(
      "MANAGER_TENANT_LINK_UNAVAILABLE",
      "This tenant detail link is no longer available.",
      400,
    );
  }
}

async function assertNoOpenTenantRequestForUnit(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    unitId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .select("id, status")
    .eq("organization_id", params.organizationId)
    .eq("unit_id", params.unitId)
    .in("status", [...OPEN_UNIT_REQUEST_STATUSES])
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (error) {
    throw error;
  }

  if (data) {
    throw new AppError(
      "MANAGER_UNIT_HAS_TENANT_REQUEST",
      "This unit already has a tenant request in progress.",
      400,
    );
  }
}

async function getActiveFirstRentPaymentLink(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    onboardingRequestId: string;
    agreementId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_rent_payment_requests")
    .select(
      `
        id,
        authorization_url,
        expires_at,
        amount_requested,
        bopa_platform_fee,
        paystack_charge_amount,
        management_fee_amount,
        landlord_net_amount,
        paystack_charge_bearer
      `,
    )
    .eq("organization_id", params.organizationId)
    .eq("onboarding_request_id", params.onboardingRequestId)
    .eq("agreement_document_id", params.agreementId)
    .eq("payment_purpose", "new_tenant_first_rent")
    .eq("collection_mode", "manager_collects")
    .in("status", ["pending", "initialized"])
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      authorization_url: string | null;
      expires_at: string | null;
      amount_requested: number;
      bopa_platform_fee: number;
      paystack_charge_amount: number;
      management_fee_amount: number;
      landlord_net_amount: number;
      paystack_charge_bearer: "tenant" | "landlord" | "manager" | "bopa";
    }>();

  if (error) {
    throw error;
  }

  if (!data?.authorization_url) {
    return null;
  }

  return {
    paymentRequestId: data.id,
    paymentUrl: data.authorization_url,
    paymentExpiresAt: data.expires_at,
    amountRequested: data.amount_requested,
    paymentBreakdown: buildManagerTenantPaymentBreakdownResult({
      rentAmount: Number(data.amount_requested),
      bopaPlatformFee: Number(data.bopa_platform_fee),
      paystackCharge: Number(data.paystack_charge_amount),
      managerCommission: Number(data.management_fee_amount),
      landlordShare: Number(data.landlord_net_amount),
      paystackChargeBearer: data.paystack_charge_bearer,
    }),
  };
}

async function initializeFirstRentPayment(params: {
  supabase: SupabaseClient;
  organizationId: string;
  organizationEmail: string | null;
  landlordClientId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  agreementId: string;
  onboardingRequestId: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string | null;
  rentAmount: number;
  periodStart: string | null;
  periodEnd: string | null;
  createdByProfileId: string;
}) {
  const property = await getManagerPropertyById(params.supabase, {
    organizationId: params.organizationId,
    landlordClientId: params.landlordClientId,
    propertyId: params.propertyId,
  });

  if (!property || property.status !== "active") {
    throw new AppError(
      "MANAGER_PROPERTY_NOT_FOUND",
      "The selected property could not be found.",
      404,
    );
  }

  const managerAccount = await getVerifiedManagerPaystackAccount(
    params.supabase,
    params.organizationId,
  );

  const breakdown = calculateManagerPaymentBreakdown({
    amountPaid: params.rentAmount,
    managementFeeType: property.management_fee_type,
    managementFeeValue: Number(property.management_fee_value),
  });

  const reference = generatePaystackReference();
  const token = generatePaymentToken();
  const customerEmail = resolveEmail({
    tenantEmail: params.tenantEmail,
    tenantPhone: params.tenantPhone,
    organizationEmail: params.organizationEmail,
  });

  const metadata = {
    product: "bopa_manager",
    payment_type: "manager_rent_payment",
    payment_purpose: "new_tenant_first_rent",
    source: "bopa_manager_new_tenant_agreement_acceptance",
    collection_mode: "manager_collects",
    organization_id: params.organizationId,
    landlord_client_id: params.landlordClientId,
    property_id: params.propertyId,
    unit_id: params.unitId,
    tenant_id: params.tenantId,
    agreement_document_id: params.agreementId,
    onboarding_request_id: params.onboardingRequestId,
  };

  const { data: pendingRequest, error } = await params.supabase
    .from("manager_rent_payment_requests")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      tenant_id: params.tenantId,
      token,
      reference,
      amount_requested: roundMoney(params.rentAmount),
      currency_code: "NGN",
      collection_mode: "manager_collects",
      payment_receiver: "bopa_verified",
      paystack_charge_bearer: property.paystack_charge_bearer,
      management_fee_type: property.management_fee_type,
      management_fee_value: Number(property.management_fee_value),
      management_fee_amount: breakdown.managerCommission,
      landlord_net_amount: breakdown.landlordShare,
      bopa_platform_fee: breakdown.bopaPlatformFee,
      paystack_charge_amount: breakdown.paystackCharge,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      tenant_name_snapshot: params.tenantName,
      tenant_phone_snapshot: params.tenantPhone,
      tenant_email_snapshot: params.tenantEmail,
      status: "pending",
      expires_at: getExpiryDateFromHours(24),
      created_by_profile_id: params.createdByProfileId,
      onboarding_request_id: params.onboardingRequestId,
      agreement_document_id: params.agreementId,
      payment_purpose: "new_tenant_first_rent",
      metadata,
    })
    .select("id, reference, expires_at")
    .single<{ id: string; reference: string; expires_at: string }>();

  if (error) {
    throw error;
  }

  const initialized = await initializePaystackTransaction({
    email: customerEmail,
    amountKobo: convertNairaToKobo(params.rentAmount),
    reference,
    callbackUrl: getManagerPaystackCallbackUrl(reference),
    subaccountCode: managerAccount.paystack_subaccount_code,
    transactionChargeKobo: convertNairaToKobo(breakdown.bopaPlatformFee),
    currencyCode: "NGN",
    metadata,
  });

  const { data: initializedRequest, error: updateError } = await params.supabase
    .from("manager_rent_payment_requests")
    .update({
      authorization_url: initialized.authorization_url,
      access_code: initialized.access_code,
      status: "initialized",
      initialized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pendingRequest.id)
    .select("id, authorization_url, expires_at")
    .single<{ id: string; authorization_url: string; expires_at: string }>();

  if (updateError) {
    throw updateError;
  }

  await markManagerOnboardingPaymentInitialized(params.supabase, {
    requestId: params.onboardingRequestId,
    paymentRequestId: initializedRequest.id,
  });

  return {
    paymentRequestId: initializedRequest.id,
    paymentUrl: initializedRequest.authorization_url,
    paymentExpiresAt: initializedRequest.expires_at,
    paymentBreakdown: buildManagerTenantPaymentBreakdownResult({
      rentAmount: params.rentAmount,
      bopaPlatformFee: breakdown.bopaPlatformFee,
      paystackCharge: breakdown.paystackCharge,
      managerCommission: breakdown.managerCommission,
      landlordShare: breakdown.landlordShare,
      paystackChargeBearer: property.paystack_charge_bearer,
    }),
  };
}

async function getAcceptedAgreementForOnboardingRequest(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    requestId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_agreement_documents")
    .select(
      `
        id,
        document_status,
        finalized_by_profile_id,
        tenant_snapshot,
        tenancy_snapshot
      `,
    )
    .eq("organization_id", params.organizationId)
    .eq("onboarding_request_id", params.requestId)
    .eq("document_status", "accepted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ManagerAcceptedAgreementPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

async function initializePaymentForAcceptedAgreement(params: {
  supabase: SupabaseClient;
  agreement: ManagerTenantAgreementDocumentRow;
}) {
  const { agreement, supabase } = params;

  if (!agreement.onboarding_request_id) {
    throw new AppError(
      "MANAGER_ONBOARDING_REQUEST_MISSING",
      "The onboarding request is missing.",
      500,
    );
  }

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: agreement.organization_id,
    requestId: agreement.onboarding_request_id,
  });

  if (request.status === "payment_paid") {
    throw new AppError(
      "MANAGER_PAYMENT_ALREADY_PAID",
      "Payment has already been completed for this agreement.",
      400,
    );
  }

  if (
    request.status === "cancelled" ||
    request.status === "rejected" ||
    request.status === "expired" ||
    request.status === "payment_expired"
  ) {
    throw new AppError(
      "MANAGER_PAYMENT_LINK_EXPIRED",
      "This payment link is no longer available. Please ask the property manager for a new tenant process.",
      410,
    );
  }

  const createdByProfileId =
    agreement.finalized_by_profile_id ?? request.approved_by_profile_id;

  if (!createdByProfileId) {
    throw new AppError(
      "MANAGER_PAYMENT_CREATOR_MISSING",
      "The payment link could not be prepared.",
      500,
    );
  }

  const tenantPhone =
    getSnapshotNullableText(agreement.tenant_snapshot, "phoneNumber") ??
    request.tenant_phone_number ??
    request.invited_tenant_phone_number;

  if (!tenantPhone) {
    throw new AppError(
      "MANAGER_TENANT_PHONE_REQUIRED",
      "Enter the tenant phone number before creating this payment link.",
      400,
    );
  }

  const rentAmount = getSnapshotNumber(
    agreement.tenancy_snapshot,
    "rentAmount",
    Number(
      request.manager_confirmed_rent_amount ??
        request.manager_units?.rent_amount ??
        request.tenant_claimed_rent_amount ??
        0,
    ),
  );

  if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
    throw new AppError(
      "MANAGER_RENT_AMOUNT_REQUIRED",
      "Set a valid rent amount for this unit before creating this payment link.",
      400,
    );
  }

  return initializeFirstRentPayment({
    supabase,
    organizationId: agreement.organization_id,
    organizationEmail: request.manager_organizations?.organization_email ?? null,
    landlordClientId: agreement.landlord_client_id,
    propertyId: agreement.property_id,
    unitId: agreement.unit_id,
    tenantId: agreement.tenant_id,
    agreementId: agreement.id,
    onboardingRequestId: agreement.onboarding_request_id,
    tenantName:
      getSnapshotNullableText(agreement.tenant_snapshot, "fullName") ??
      request.tenant_full_name ??
      request.invited_tenant_full_name ??
      "Tenant",
    tenantPhone,
    tenantEmail:
      getSnapshotNullableText(agreement.tenant_snapshot, "email") ??
      request.tenant_email ??
      request.invited_tenant_email ??
      null,
    rentAmount,
    periodStart:
      getSnapshotNullableText(agreement.tenancy_snapshot, "moveInDate") ??
      request.manager_confirmed_move_in_date,
    periodEnd:
      getSnapshotNullableText(agreement.tenancy_snapshot, "nextRentDueDate") ??
      request.manager_confirmed_next_rent_due_date,
    createdByProfileId,
  });
}

export async function createManagerTenantOnboardingRequestForCurrentManager(
  input: CreateManagerTenantOnboardingRequestInput,
) {
  const { supabase, organization } = await requireManagerOrganization();

  const [property, unit] = await Promise.all([
    getManagerPropertyById(supabase, {
      organizationId: organization.id,
      landlordClientId: input.landlordClientId,
      propertyId: input.propertyId,
    }),
    getManagerUnitById(supabase, {
      organizationId: organization.id,
      landlordClientId: input.landlordClientId,
      propertyId: input.propertyId,
      unitId: input.unitId,
    }),
  ]);

  if (!property || property.status !== "active") {
    throw new AppError(
      "MANAGER_PROPERTY_NOT_FOUND",
      "The selected property could not be found.",
      404,
    );
  }

  if (!unit || unit.status !== "vacant") {
    throw new AppError(
      "MANAGER_UNIT_NOT_VACANT",
      "Select a vacant unit before sending a tenant link.",
      400,
    );
  }

  await assertNoOpenTenantRequestForUnit(supabase, {
    organizationId: organization.id,
    unitId: input.unitId,
  });

  const hasCurrentTenant = await hasCurrentManagerTenantForUnit(supabase, {
    organizationId: organization.id,
    unitId: input.unitId,
  });

  if (hasCurrentTenant) {
    throw new AppError(
      "MANAGER_UNIT_ALREADY_HAS_CURRENT_TENANT",
      "This unit already has a current tenant.",
      400,
    );
  }

  const tenantPhone = normalisePhoneNumber(input.phoneNumber);
  const rawToken = createSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getExpiryDateFromHours(168);

  const request = await createManagerTenantOnboardingRequest(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
    unitId: input.unitId,
    onboardingType: input.onboardingType,
    tokenHash,
    tokenExpiresAt: expiresAt,
    invitedTenantFullName: input.fullName,
    invitedTenantPhoneNumber: tenantPhone.e164,
    invitedTenantEmail: input.email?.trim().toLowerCase() ?? null,
    note: nullableText(input.note),
    metadata: {
      source: "bopa_manager_tenant_onboarding_link",
    },
  });

  const claimUrl = getManagerTenantOnboardingUrl(rawToken);

  return {
    request,
    claimUrl,
    tenantWhatsappNumber: tenantPhone.national,
    whatsappMessage: buildTenantDetailMessage({
      tenantName: input.fullName,
      organizationName: organization.organization_name,
      propertyName: property.property_name,
      unitLabel: unit.unit_label,
      claimUrl,
    }),
    expiresAt,
  };
}

export async function resendManagerTenantOnboardingLinkForCurrentManager(
  input: ResendManagerTenantOnboardingLinkInput,
) {
  const { supabase, organization } = await requireManagerOrganization();

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: organization.id,
    requestId: input.requestId,
  });

  if (request.status !== "pending") {
    throw new AppError(
      "MANAGER_TENANT_LINK_NOT_PENDING",
      "This tenant request has already moved past the details step.",
      400,
    );
  }

  const tenantPhone =
    request.invited_tenant_phone_number ?? request.tenant_phone_number;

  if (!tenantPhone) {
    throw new AppError(
      "MANAGER_TENANT_PHONE_REQUIRED",
      "Enter the tenant phone number before sending a tenant link.",
      400,
    );
  }

  const rawToken = createSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getExpiryDateFromHours(168);
  const requestMetadata = request.metadata ?? {};
  const regeneratedCount =
    typeof requestMetadata.tenant_detail_link_regenerated_count === "number"
      ? requestMetadata.tenant_detail_link_regenerated_count + 1
      : 1;

  const updatedRequest = await updateManagerTenantOnboardingRequestToken(
    supabase,
    {
      organizationId: organization.id,
      requestId: request.id,
      tokenHash,
      tokenExpiresAt: expiresAt,
      metadata: {
        ...requestMetadata,
        tenant_detail_link_regenerated_at: new Date().toISOString(),
        tenant_detail_link_regenerated_count: regeneratedCount,
      },
    },
  );

  const claimUrl = getManagerTenantOnboardingUrl(rawToken);
  const phone = normalisePhoneNumber(tenantPhone);
  const tenantName =
    updatedRequest.invited_tenant_full_name ??
    updatedRequest.tenant_full_name ??
    "Tenant";

  return {
    request: updatedRequest,
    claimUrl,
    tenantWhatsappNumber: phone.national,
    whatsappMessage: buildTenantDetailMessage({
      tenantName,
      organizationName: organization.organization_name,
      propertyName:
        updatedRequest.manager_properties?.property_name ?? "the property",
      unitLabel: updatedRequest.manager_units?.unit_label ?? "the unit",
      claimUrl,
    }),
    expiresAt,
  };
}

export async function resolveManagerTenantOnboardingToken(token: string) {
  const request = await getManagerTenantOnboardingRequestByTokenHash(
    createSupabaseAdminClient(),
    hashToken(token),
  );

  if (!request) {
    throw new AppError(
      "MANAGER_TENANT_LINK_NOT_FOUND",
      "This tenant detail link is invalid.",
      404,
    );
  }

  assertPublicRequestUsable(request);

  return request;
}

export async function submitManagerTenantOnboardingRequestByToken(
  input: SubmitManagerTenantOnboardingRequestInput,
) {
  const supabase = createSupabaseAdminClient();
  const request = await resolveManagerTenantOnboardingToken(input.token);
  const phone = normalisePhoneNumber(input.phoneNumber);

  const isCurrentOccupant = request.onboarding_type === "current_occupant";

  if (isCurrentOccupant && !input.moveInDate) {
    throw new AppError(
      "MANAGER_MOVE_IN_DATE_REQUIRED",
      "Enter the move-in date.",
      400,
    );
  }

  if (isCurrentOccupant && !input.claimedRentAmount) {
    throw new AppError(
      "MANAGER_RENT_AMOUNT_REQUIRED",
      "Enter the rent amount.",
      400,
    );
  }

  const paymentFrequency = input.paymentFrequency ?? "annual";

  const nextRentDueDate =
    isCurrentOccupant && input.moveInDate
      ? calculateManagerOnboardingNextRentDueDate({
          onboardingType: request.onboarding_type,
          moveInDate: input.moveInDate,
          paymentFrequency,
        })
      : null;

  return submitManagerTenantOnboardingRequest(supabase, {
    requestId: request.id,
    fullName: input.fullName,
    phoneNumber: phone.e164,
    email: input.email?.trim().toLowerCase() ?? null,
    occupation: nullableText(input.occupation),
    idType: input.idType,
    idNumber: input.idNumber,
    moveInDate: input.moveInDate ?? null,
    statedRentDueDate: nextRentDueDate,
    claimedRentAmount: input.claimedRentAmount ?? null,
    paymentFrequency,
    tenantNotes: nullableText(input.tenantNotes),
  });
}

export async function approveManagerTenantOnboardingRequestForCurrentManager(
  input: ApproveManagerTenantOnboardingRequestInput,
) {
  const { supabase, profile, organization } = await requireManagerOrganization();
  const adminSupabase = createSupabaseAdminClient();

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: organization.id,
    requestId: input.requestId,
  });

  if (request.status !== "submitted") {
    throw new AppError(
      "MANAGER_ONBOARDING_NOT_READY",
      "Only submitted tenant details can be approved.",
      400,
    );
  }

  if (!request.tenant_full_name || !request.tenant_phone_number) {
    throw new AppError(
      "MANAGER_ONBOARDING_DETAILS_MISSING",
      "The tenant details are incomplete.",
      400,
    );
  }

  if (
    request.onboarding_type === "current_occupant" &&
    (!request.tenant_move_in_date || !request.tenant_claimed_rent_amount)
  ) {
    throw new AppError(
      "MANAGER_ONBOARDING_DETAILS_MISSING",
      "The tenant rent details are incomplete.",
      400,
    );
  }

  if (request.onboarding_type === "new_incoming_tenant") {
    await getVerifiedManagerPaystackAccount(adminSupabase, organization.id);
  }

  assertNewIncomingMoveInDate({
    onboardingType: request.onboarding_type,
    moveInDate: input.confirmedMoveInDate,
  });

  const confirmedRentAmount = Number(
    request.manager_units?.rent_amount ?? input.confirmedRentAmount,
  );

  if (!Number.isFinite(confirmedRentAmount) || confirmedRentAmount <= 0) {
    throw new AppError(
      "MANAGER_UNIT_RENT_REQUIRED",
      "Set a valid rent amount for this unit before approving the tenant.",
      400,
    );
  }

  const paymentFrequency = (request.tenant_payment_frequency ??
    "annual") as ManagerOnboardingPaymentFrequency;

  const nextRentDueDate = calculateManagerOnboardingNextRentDueDate({
    onboardingType: request.onboarding_type,
    moveInDate: input.confirmedMoveInDate,
    paymentFrequency,
  });

  const hasCurrentTenant = await hasCurrentManagerTenantForUnit(adminSupabase, {
    organizationId: organization.id,
    unitId: request.unit_id,
  });

  if (hasCurrentTenant) {
    throw new AppError(
      "MANAGER_UNIT_ALREADY_HAS_CURRENT_TENANT",
      "This unit already has a current tenant.",
      400,
    );
  }

  const tenantStatus =
    request.onboarding_type === "new_incoming_tenant" ? "inactive" : "active";

  const tenant = await createManagerTenantRecord(adminSupabase, {
    organizationId: organization.id,
    landlordClientId: request.landlord_client_id,
    propertyId: request.property_id,
    unitId: request.unit_id,
    fullName: request.tenant_full_name,
    phoneNumber: request.tenant_phone_number,
    email: request.tenant_email,
    occupation: request.tenant_occupation,
    rentAmount: roundMoney(confirmedRentAmount),
    currentBalance: roundMoney(input.openingBalance),
    moveInDate: input.confirmedMoveInDate,
    nextRentDueDate,
    status: tenantStatus,
    notes: nullableText(input.reviewNotes),
  });

  const approvedStatus =
    request.onboarding_type === "new_incoming_tenant"
      ? "agreement_sent"
      : "approved";

  if (request.onboarding_type === "current_occupant") {
    await updateManagerUnitStatusDirect(adminSupabase, {
      organizationId: organization.id,
      unitId: request.unit_id,
      status: "occupied",
    });

    await updateManagerTenantOnboardingRequestReviewed(adminSupabase, {
      requestId: request.id,
      organizationId: organization.id,
      status: approvedStatus,
      approvedTenantId: tenant.id,
      approvedByProfileId: profile.id,
      confirmedRentAmount,
      confirmedMoveInDate: input.confirmedMoveInDate,
      confirmedNextRentDueDate: nextRentDueDate,
      openingBalance: input.openingBalance,
      reviewNotes: nullableText(input.reviewNotes),
      metadata: {
        ...request.metadata,
        approved_as: "current_occupant",
        next_rent_due_date: nextRentDueDate,
        payment_frequency: paymentFrequency,
      },
    });

    return {
      tenant,
      agreement: null,
      agreementUrl: null,
      whatsappMessage: null,
      tenantWhatsappNumber: null,
    };
  }

  await updateManagerUnitStatusDirect(adminSupabase, {
    organizationId: organization.id,
    unitId: request.unit_id,
    status: "reserved",
  });

  const agreementToken = createSecureToken();
  const agreementUrl = getManagerAgreementUrl(agreementToken);

  const propertyName =
    request.manager_properties?.property_name ?? "the property";
  const propertyAddress =
    request.manager_properties?.property_address ?? "the property address";
  const unitLabel = request.manager_units?.unit_label ?? "the unit";
  const landlordName =
    request.manager_landlord_clients?.landlord_name ?? "the landlord";

  const agreementBody = buildManagerTenancyAgreementTemplate({
    organization: {
      name: organization.organization_name,
      phone: organization.organization_phone,
      email: organization.organization_email,
    },
    landlord: {
      name: landlordName,
      phone: request.manager_landlord_clients?.landlord_phone ?? null,
      email: request.manager_landlord_clients?.landlord_email ?? null,
      address: null,
    },
    tenant: {
      fullName: tenant.full_name,
      phoneNumber: tenant.phone_number,
      email: tenant.email,
    },
    property: {
      propertyName,
      propertyAddress,
      unitLabel,
    },
    tenancy: {
      rentAmount: confirmedRentAmount,
      currencyCode: "NGN",
      moveInDate: input.confirmedMoveInDate,
      nextRentDueDate,
      paymentFrequency,
      agreementNotes: nullableText(input.reviewNotes),
    },
  });

  const agreement = await createManagerTenantAgreementDocument(adminSupabase, {
    organizationId: organization.id,
    landlordClientId: request.landlord_client_id,
    propertyId: request.property_id,
    unitId: request.unit_id,
    tenantId: tenant.id,
    onboardingRequestId: request.id,
    agreementBody,
    tokenHash: hashToken(agreementToken),
    tokenExpiresAt: getExpiryDateFromHours(168),
    finalizedByProfileId: profile.id,
    managerSnapshot: {
      id: organization.id,
      name: organization.organization_name,
      phone: organization.organization_phone,
      email: organization.organization_email,
    },
    landlordSnapshot: {
      id: request.landlord_client_id,
      name: landlordName,
      phone: request.manager_landlord_clients?.landlord_phone ?? null,
      email: request.manager_landlord_clients?.landlord_email ?? null,
    },
    tenantSnapshot: {
      id: tenant.id,
      fullName: tenant.full_name,
      phoneNumber: tenant.phone_number,
      email: tenant.email,
    },
    propertySnapshot: {
      id: request.property_id,
      propertyName,
      propertyAddress,
      unitId: request.unit_id,
      unitLabel,
    },
    tenancySnapshot: {
      rentAmount: confirmedRentAmount,
      moveInDate: input.confirmedMoveInDate,
      nextRentDueDate,
      openingBalance: input.openingBalance,
      paymentFrequency,
    },
    metadata: {
      onboarding_request_id: request.id,
      source: "bopa_manager_new_incoming_tenant",
      collection_mode: "manager_collects",
      next_rent_due_date: nextRentDueDate,
      payment_frequency: paymentFrequency,
    },
  });

  await updateManagerTenantOnboardingRequestReviewed(adminSupabase, {
    requestId: request.id,
    organizationId: organization.id,
    status: approvedStatus,
    approvedTenantId: tenant.id,
    approvedByProfileId: profile.id,
    confirmedRentAmount,
    confirmedMoveInDate: input.confirmedMoveInDate,
    confirmedNextRentDueDate: nextRentDueDate,
    openingBalance: input.openingBalance,
    reviewNotes: nullableText(input.reviewNotes),
    metadata: {
      ...request.metadata,
      approved_as: "new_incoming_tenant",
      agreement_id: agreement.id,
      collection_mode: "manager_collects",
      next_rent_due_date: nextRentDueDate,
      payment_frequency: paymentFrequency,
    },
  });

  const phone = normalisePhoneNumber(tenant.phone_number);

  return {
    tenant,
    agreement,
    agreementUrl,
    tenantWhatsappNumber: phone.national,
    whatsappMessage: buildAgreementMessage({
      tenantName: tenant.full_name,
      organizationName: organization.organization_name,
      propertyName,
      unitLabel,
      agreementUrl,
    }),
  };
}

export async function rejectManagerTenantOnboardingRequestForCurrentManager(
  input: RejectManagerTenantOnboardingRequestInput,
) {
  const { supabase, profile, organization } = await requireManagerOrganization();

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: organization.id,
    requestId: input.requestId,
  });

  if (request.status !== "submitted") {
    throw new AppError(
      "MANAGER_ONBOARDING_NOT_REJECTABLE",
      "Only submitted tenant details can be rejected.",
      400,
    );
  }

  return updateManagerTenantOnboardingRequestReviewed(supabase, {
    requestId: request.id,
    organizationId: organization.id,
    status: "rejected",
    approvedTenantId: null,
    approvedByProfileId: profile.id,
    confirmedRentAmount: null,
    confirmedMoveInDate: null,
    confirmedNextRentDueDate: null,
    openingBalance: 0,
    reviewNotes: input.reason,
    metadata: {
      ...request.metadata,
      rejected_at: new Date().toISOString(),
      rejection_reason: input.reason,
    },
  });
}

export async function resendManagerFirstRentPaymentLinkForCurrentManager(
  input: ResendManagerFirstRentPaymentLinkInput,
) {
  const { organization } = await requireManagerOrganization();
  const adminSupabase = createSupabaseAdminClient();

  await expireManagerNewTenantPaymentRequests(adminSupabase);

  const request = await getManagerTenantOnboardingRequestById(adminSupabase, {
    organizationId: organization.id,
    requestId: input.requestId,
  });

  if (request.onboarding_type !== "new_incoming_tenant") {
    throw new AppError(
      "MANAGER_PAYMENT_LINK_NOT_ALLOWED",
      "This tenant does not need a first rent payment link.",
      400,
    );
  }

  if (
    request.status !== "agreement_accepted" &&
    request.status !== "payment_initialized"
  ) {
    throw new AppError(
      "MANAGER_PAYMENT_LINK_NOT_READY",
      "This tenant is not ready for a payment link.",
      400,
    );
  }

  if (!request.approved_tenant_id || !request.approved_by_profile_id) {
    throw new AppError(
      "MANAGER_APPROVED_TENANT_MISSING",
      "Approve this tenant before sending a payment link.",
      400,
    );
  }

  const agreement = await getAcceptedAgreementForOnboardingRequest(
    adminSupabase,
    {
      organizationId: organization.id,
      requestId: request.id,
    },
  );

  if (!agreement) {
    throw new AppError(
      "MANAGER_ACCEPTED_AGREEMENT_REQUIRED",
      "The tenant must accept the agreement before payment.",
      400,
    );
  }

  const tenantPhone =
    request.tenant_phone_number ?? request.invited_tenant_phone_number;

  if (!tenantPhone) {
    throw new AppError(
      "MANAGER_TENANT_PHONE_REQUIRED",
      "Enter the tenant phone number before sending a payment link.",
      400,
    );
  }

  const activePayment = await getActiveFirstRentPaymentLink(adminSupabase, {
    organizationId: organization.id,
    onboardingRequestId: request.id,
    agreementId: agreement.id,
  });

  const propertyName =
    request.manager_properties?.property_name ?? "the property";
  const unitLabel = request.manager_units?.unit_label ?? "the unit";
  const tenantName =
    request.tenant_full_name ?? request.invited_tenant_full_name ?? "Tenant";

  if (activePayment) {
    const phone = normalisePhoneNumber(tenantPhone);

    return {
      paymentRequestId: activePayment.paymentRequestId,
      paymentUrl: activePayment.paymentUrl,
      paymentExpiresAt: activePayment.paymentExpiresAt,
      paymentBreakdown: activePayment.paymentBreakdown,
      tenantWhatsappNumber: phone.national,
      whatsappMessage: buildFirstRentPaymentMessage({
        tenantName,
        organizationName: organization.organization_name,
        propertyName,
        unitLabel,
        amount: activePayment.amountRequested,
        paymentUrl: activePayment.paymentUrl,
        expiresAt: activePayment.paymentExpiresAt,
      }),
    };
  }

  const rentAmount = getSnapshotNumber(
    agreement.tenancy_snapshot,
    "rentAmount",
    Number(
      request.manager_confirmed_rent_amount ??
        request.manager_units?.rent_amount ??
        request.tenant_claimed_rent_amount ??
        0,
    ),
  );

  if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
    throw new AppError(
      "MANAGER_RENT_AMOUNT_REQUIRED",
      "Set a valid rent amount for this unit before sending a payment link.",
      400,
    );
  }

  const payment = await initializeFirstRentPayment({
    supabase: adminSupabase,
    organizationId: organization.id,
    organizationEmail: organization.organization_email,
    landlordClientId: request.landlord_client_id,
    propertyId: request.property_id,
    unitId: request.unit_id,
    tenantId: request.approved_tenant_id,
    agreementId: agreement.id,
    onboardingRequestId: request.id,
    tenantName,
    tenantPhone,
    tenantEmail: request.tenant_email ?? request.invited_tenant_email ?? null,
    rentAmount,
    periodStart: request.manager_confirmed_move_in_date,
    periodEnd: request.manager_confirmed_next_rent_due_date,
    createdByProfileId:
      agreement.finalized_by_profile_id ?? request.approved_by_profile_id,
  });

  await updateManagerUnitStatusDirect(adminSupabase, {
    organizationId: organization.id,
    unitId: request.unit_id,
    status: "reserved",
  });

  const phone = normalisePhoneNumber(tenantPhone);

  return {
    paymentRequestId: payment.paymentRequestId,
    paymentUrl: payment.paymentUrl,
    paymentExpiresAt: payment.paymentExpiresAt,
    paymentBreakdown: payment.paymentBreakdown,
    tenantWhatsappNumber: phone.national,
    whatsappMessage: buildFirstRentPaymentMessage({
      tenantName,
      organizationName: organization.organization_name,
      propertyName,
      unitLabel,
      amount: payment.paymentBreakdown.rentAmount,
      paymentUrl: payment.paymentUrl,
      expiresAt: payment.paymentExpiresAt,
    }),
  };
}

function assertAgreementUsable(agreement: ManagerTenantAgreementDocumentRow) {
  if (!agreement.tenant_acceptance_token_expires_at) {
    throw new AppError(
      "MANAGER_AGREEMENT_LINK_INVALID",
      "This agreement link is invalid.",
      404,
    );
  }

  if (
    new Date(agreement.tenant_acceptance_token_expires_at).getTime() < Date.now()
  ) {
    throw new AppError(
      "MANAGER_AGREEMENT_LINK_EXPIRED",
      "This agreement link has expired. Please ask the property manager for a new link.",
      410,
    );
  }
}

export async function resolveManagerTenantAgreementToken(token: string) {
  const agreement = await getManagerTenantAgreementByTokenHash(
    createSupabaseAdminClient(),
    hashToken(token),
  );

  if (!agreement) {
    throw new AppError(
      "MANAGER_AGREEMENT_NOT_FOUND",
      "This agreement link is invalid.",
      404,
    );
  }

  assertAgreementUsable(agreement);

  return agreement;
}

export async function acceptManagerTenantAgreementAndCreatePayment(
  input: AcceptManagerTenantAgreementInput & {
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const supabase = createSupabaseAdminClient();
  const agreement = await resolveManagerTenantAgreementToken(input.token);

  await expireManagerNewTenantPaymentRequests(supabase);

  if (agreement.document_status === "accepted") {
    if (!agreement.onboarding_request_id) {
      throw new AppError(
        "MANAGER_ONBOARDING_REQUEST_MISSING",
        "The onboarding request is missing.",
        500,
      );
    }

    const activePayment = await getActiveFirstRentPaymentLink(supabase, {
      organizationId: agreement.organization_id,
      onboardingRequestId: agreement.onboarding_request_id,
      agreementId: agreement.id,
    });

    if (activePayment) {
      return {
        agreement,
        paymentRequestId: activePayment.paymentRequestId,
        paymentUrl: activePayment.paymentUrl,
        paymentExpiresAt: activePayment.paymentExpiresAt,
        paymentBreakdown: activePayment.paymentBreakdown,
      };
    }

    const payment = await initializePaymentForAcceptedAgreement({
      supabase,
      agreement,
    });

    return {
      agreement,
      paymentRequestId: payment.paymentRequestId,
      paymentUrl: payment.paymentUrl,
      paymentExpiresAt: payment.paymentExpiresAt,
      paymentBreakdown: payment.paymentBreakdown,
    };
  }

  if (agreement.document_status !== "sent_to_tenant") {
    throw new AppError(
      "MANAGER_AGREEMENT_NOT_READY",
      "This agreement is not ready for acceptance.",
      400,
    );
  }

  const acceptedAgreement = await acceptManagerTenantAgreement(supabase, {
    agreementId: agreement.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  if (!acceptedAgreement.onboarding_request_id) {
    throw new AppError(
      "MANAGER_ONBOARDING_REQUEST_MISSING",
      "The onboarding request is missing.",
      500,
    );
  }

  await markManagerOnboardingAgreementAccepted(supabase, {
    requestId: acceptedAgreement.onboarding_request_id,
  });

  const payment = await initializePaymentForAcceptedAgreement({
    supabase,
    agreement: acceptedAgreement,
  });

  return {
    agreement: acceptedAgreement,
    paymentRequestId: payment.paymentRequestId,
    paymentUrl: payment.paymentUrl,
    paymentExpiresAt: payment.paymentExpiresAt,
    paymentBreakdown: payment.paymentBreakdown,
  };
}

export async function declineManagerTenantAgreementAndCancel(
  input: DeclineManagerTenantAgreementInput & {
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const supabase = createSupabaseAdminClient();
  const agreement = await resolveManagerTenantAgreementToken(input.token);

  if (agreement.document_status === "voided") {
    return {
      agreement,
    };
  }

  if (!agreement.onboarding_request_id) {
    throw new AppError(
      "MANAGER_ONBOARDING_REQUEST_MISSING",
      "The tenant request is missing.",
      500,
    );
  }

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: agreement.organization_id,
    requestId: agreement.onboarding_request_id,
  });

  if (request.status === "payment_paid") {
    throw new AppError(
      "MANAGER_AGREEMENT_ALREADY_PAID",
      "Payment has already been made for this agreement.",
      400,
    );
  }

  const reason = nullableText(input.reason) ?? "Tenant declined the agreement.";
  const now = new Date().toISOString();

  const voidedAgreement = await voidManagerTenantAgreement(supabase, {
    agreementId: agreement.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      ...agreement.metadata,
      declined_at: now,
      decline_reason: reason,
    },
  });

  await cancelManagerOnboardingAfterAgreementDecline(supabase, {
    organizationId: agreement.organization_id,
    requestId: agreement.onboarding_request_id,
    metadata: {
      ...request.metadata,
      cancelled_at: now,
      cancellation_reason: reason,
      agreement_id: agreement.id,
    },
  });

  await updateManagerUnitStatusDirect(supabase, {
    organizationId: agreement.organization_id,
    unitId: agreement.unit_id,
    status: "vacant",
  });

  await deactivateManagerProspectiveTenant(supabase, {
    organizationId: agreement.organization_id,
    tenantId: agreement.tenant_id,
  });

  await expireManagerFirstRentPaymentRequestsForAgreement(supabase, {
    organizationId: agreement.organization_id,
    onboardingRequestId: agreement.onboarding_request_id,
    agreementDocumentId: agreement.id,
    reason,
  });

  return {
    agreement: voidedAgreement,
  };
}
