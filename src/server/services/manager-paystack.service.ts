import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateManagerPaymentBreakdown,
  roundMoney,
} from "@/lib/manager-automation";
import { AppError, isAppError } from "@/server/errors/app-error";
import {
  getActiveManagerLandlordPaystackAccount,
  getActiveManagerPaystackAccount,
} from "@/server/repositories/manager-paystack-accounts.repository";
import {
  createPendingManagerPaystackPaymentRequest,
  expireManagerNewTenantPaymentRequests,
  getManagerPaystackPaymentRequestByReference,
  getManagerRentPaymentByPaymentReference,
  getManagerTenantForPaystackRequest,
  markManagerPaystackPaymentRequestFailed,
  markManagerPaystackPaymentRequestInitialized,
  markManagerPaystackPaymentRequestPaid,
  type ManagerRentPaymentRequestRow,
} from "@/server/repositories/manager-paystack.repository";
import {
  getManagerOrganizationForCurrentUser,
  getManagerPropertyById,
  getManagerUnitById,
  hasCurrentManagerTenantForUnit,
  isCurrentManagerTenantStatus,
  recordManagerRentPayment as recordManagerRentPaymentRecord,
} from "@/server/repositories/manager.repository";
import {
  getManagerTenantOnboardingRequestById,
  updateManagerTenantOnboardingStatus,
  updateManagerUnitStatusDirect,
} from "@/server/repositories/manager-tenant-onboarding.repository";
import {
  assertPaystackAmountMatchesExpected,
  convertNairaToKobo,
  createAgentDealTransactionSplit,
  initializePaystackMultiSplitTransaction,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { CreateManagerPaystackPaymentRequestInput } from "@/server/validators/manager-paystack.schema";

type ManagerProfileRow = {
  id: string;
  role: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  is_active: boolean;
};

type ManagerSettlementInitialization = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  settlementMetadata: Record<string, unknown>;
};

type FirstRentAgreementGuardRow = {
  id: string;
  organization_id: string;
  onboarding_request_id: string | null;
  tenant_id: string;
  document_status: "draft" | "sent_to_tenant" | "accepted" | "voided";
};

export type ManagerPaystackVerificationResult = {
  status: "processed" | "duplicate";
  message: string;
  paymentRequestId: string;
  paymentId: string;
  verifiedPayload: Record<string, unknown>;
};

function nullableText(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function nullableDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function generatePaystackReference() {
  return `BPM-${crypto.randomUUID().replaceAll("-", "").slice(0, 22).toUpperCase()}`;
}

function generatePaymentToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BOPA_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!configuredUrl) {
    throw new AppError(
      "APP_URL_MISSING",
      "App URL is not configured for payment callback.",
      500,
    );
  }

  return configuredUrl.replace(/\/$/, "");
}

function getManagerPaystackCallbackUrl(reference: string) {
  return `${getAppBaseUrl()}/pay/manager/callback?reference=${encodeURIComponent(
    reference,
  )}`;
}

function resolvePaystackCustomerEmail(params: {
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

  const sanitizedPhone = params.tenantPhone.replace(/\D/g, "");

  if (sanitizedPhone.length >= 7) {
    return `manager-tenant-${sanitizedPhone}@boldverseproperty.com`;
  }

  return "payments@boldverseproperty.com";
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function isManagerPaymentNotFoundError(error: unknown) {
  return (
    isAppError(error) &&
    error.code === "MANAGER_PAYSTACK_PAYMENT_REQUEST_NOT_FOUND"
  );
}

function isManagerPaymentExpiredError(error: unknown) {
  return isAppError(error) && error.code === "MANAGER_PAYSTACK_PAYMENT_EXPIRED";
}

function isFirstRentPaymentRequestExpired(
  paymentRequest: ManagerRentPaymentRequestRow,
) {
  if (paymentRequest.payment_purpose !== "new_tenant_first_rent") {
    return false;
  }

  if (!paymentRequest.expires_at) {
    return false;
  }

  return new Date(paymentRequest.expires_at).getTime() <= Date.now();
}

function assertPaymentRequestStillPayable(
  paymentRequest: ManagerRentPaymentRequestRow,
) {
  if (paymentRequest.status === "expired") {
    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_EXPIRED",
      "This payment link has expired. Please ask the property manager for a new link.",
      410,
    );
  }

  if (paymentRequest.status === "cancelled") {
    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_CANCELLED",
      "This payment link is no longer available.",
      410,
    );
  }

  if (isFirstRentPaymentRequestExpired(paymentRequest)) {
    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_EXPIRED",
      "This payment link has expired. Please ask the property manager for a new link.",
      410,
    );
  }

  if (
    paymentRequest.status !== "initialized" &&
    paymentRequest.status !== "pending"
  ) {
    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_NOT_PAYABLE",
      "This manager payment request can no longer be verified.",
      400,
    );
  }
}

export function isManagerPaystackReference(reference: string) {
  const normalized = reference.trim().toUpperCase();

  return normalized.startsWith("BPM-") || normalized.startsWith("BOPA_MGR_");
}

export function isManagerPaystackMetadata(
  rawPayload?: Record<string, unknown>,
) {
  if (!rawPayload) {
    return false;
  }

  const data = toRecord(rawPayload.data);
  const metadata = toRecord(data.metadata);

  return (
    metadata.product === "bopa_manager" ||
    metadata.payment_type === "manager_rent_payment" ||
    metadata.source === "bopa_manager_paystack_request" ||
    metadata.source === "bopa_manager_new_tenant_agreement_acceptance"
  );
}

export function isManagerPaystackWebhook(params: {
  reference: string;
  rawPayload?: Record<string, unknown>;
}) {
  return (
    isManagerPaystackReference(params.reference) ||
    isManagerPaystackMetadata(params.rawPayload)
  );
}

async function getCurrentManagerProfile() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AppError(
      "MANAGER_AUTH_REQUIRED",
      "Please sign in to continue.",
      401,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email, is_active")
    .eq("id", user.id)
    .maybeSingle<ManagerProfileRow>();

  if (profileError) {
    throw profileError;
  }

  if (!profile || !profile.is_active) {
    throw new AppError(
      "MANAGER_PROFILE_NOT_FOUND",
      "We could not find your active BOPA profile.",
      403,
    );
  }

  if (profile.role !== "manager") {
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

async function getFirstRentAgreementForPaymentRequest(
  supabase: SupabaseClient,
  paymentRequest: ManagerRentPaymentRequestRow,
) {
  if (!paymentRequest.agreement_document_id) {
    throw new AppError(
      "MANAGER_FIRST_RENT_AGREEMENT_MISSING",
      "The agreement for this payment could not be found.",
      500,
    );
  }

  const { data, error } = await supabase
    .from("manager_tenant_agreement_documents")
    .select(
      "id, organization_id, onboarding_request_id, tenant_id, document_status",
    )
    .eq("organization_id", paymentRequest.organization_id)
    .eq("id", paymentRequest.agreement_document_id)
    .maybeSingle<FirstRentAgreementGuardRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError(
      "MANAGER_FIRST_RENT_AGREEMENT_NOT_FOUND",
      "The agreement for this payment could not be found.",
      404,
    );
  }

  return data;
}

async function assertFirstRentPaymentStillValid(
  supabase: SupabaseClient,
  paymentRequest: ManagerRentPaymentRequestRow,
) {
  if (paymentRequest.payment_purpose !== "new_tenant_first_rent") {
    return null;
  }

  if (!paymentRequest.onboarding_request_id) {
    throw new AppError(
      "MANAGER_FIRST_RENT_REQUEST_MISSING",
      "The tenant request for this payment could not be found.",
      500,
    );
  }

  const agreement = await getFirstRentAgreementForPaymentRequest(
    supabase,
    paymentRequest,
  );

  if (agreement.document_status === "voided") {
    throw new AppError(
      "MANAGER_AGREEMENT_DECLINED",
      "This agreement was declined. The payment link is no longer available.",
      410,
    );
  }

  if (agreement.document_status !== "accepted") {
    throw new AppError(
      "MANAGER_AGREEMENT_NOT_ACCEPTED",
      "The agreement must be accepted before payment.",
      400,
    );
  }

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: paymentRequest.organization_id,
    requestId: paymentRequest.onboarding_request_id,
  });

  if (
    request.status === "cancelled" ||
    request.status === "rejected" ||
    request.status === "expired"
  ) {
    throw new AppError(
      "MANAGER_TENANT_REQUEST_CANCELLED",
      "This tenant request is no longer available.",
      410,
    );
  }

  if (request.status === "payment_expired") {
    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_EXPIRED",
      "This payment link has expired. Please ask the property manager for a new link.",
      410,
    );
  }

  if (
    request.status !== "agreement_accepted" &&
    request.status !== "payment_initialized" &&
    request.status !== "payment_paid"
  ) {
    throw new AppError(
      "MANAGER_FIRST_RENT_NOT_READY",
      "This first rent payment is not ready.",
      400,
    );
  }

  return request;
}

async function activateManagerTenantAfterFirstRent(
  supabase: SupabaseClient,
  paymentRequest: ManagerRentPaymentRequestRow,
) {
  const hasAnotherCurrentTenant = await hasCurrentManagerTenantForUnit(
    supabase,
    {
      organizationId: paymentRequest.organization_id,
      unitId: paymentRequest.unit_id,
      excludeTenantId: paymentRequest.tenant_id,
    },
  );

  if (hasAnotherCurrentTenant) {
    throw new AppError(
      "MANAGER_UNIT_ALREADY_HAS_CURRENT_TENANT",
      "This unit already has a current tenant.",
      400,
    );
  }

  const { error } = await supabase
    .from("manager_tenants")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", paymentRequest.organization_id)
    .eq("id", paymentRequest.tenant_id)
    .in("status", ["inactive", "active"]);

  if (error) {
    throw error;
  }
}

async function finalizeFirstRentPayment(
  supabase: SupabaseClient,
  params: {
    paymentRequest: ManagerRentPaymentRequestRow;
    paymentId: string;
    verifiedPayload: Record<string, unknown>;
    paidAt: string;
  },
) {
  if (params.paymentRequest.payment_purpose !== "new_tenant_first_rent") {
    return;
  }

  if (!params.paymentRequest.onboarding_request_id) {
    throw new AppError(
      "MANAGER_FIRST_RENT_REQUEST_MISSING",
      "The tenant request for this payment could not be found.",
      500,
    );
  }

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: params.paymentRequest.organization_id,
    requestId: params.paymentRequest.onboarding_request_id,
  });

  await activateManagerTenantAfterFirstRent(supabase, params.paymentRequest);

  await updateManagerUnitStatusDirect(supabase, {
    organizationId: params.paymentRequest.organization_id,
    unitId: params.paymentRequest.unit_id,
    status: "occupied",
  });

  await updateManagerTenantOnboardingStatus(supabase, {
    organizationId: params.paymentRequest.organization_id,
    requestId: params.paymentRequest.onboarding_request_id,
    status: "payment_paid",
    metadata: {
      ...request.metadata,
      payment_paid_at: params.paidAt,
      payment_request_id: params.paymentRequest.id,
      processed_payment_id: params.paymentId,
      paystack_reference: params.paymentRequest.reference,
      verified_payload: params.verifiedPayload,
    },
  });
}

async function initializeManagerPaymentSettlement(params: {
  supabase: SupabaseClient;
  organizationId: string;
  landlordClientId: string;
  reference: string;
  customerEmail: string;
  amountRequested: number;
  managerCommission: number;
  landlordShare: number;
  bopaPlatformFee: number;
  collectionMode: "automatic_split" | "manager_collects" | "landlord_direct";
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<ManagerSettlementInitialization> {
  const amountKobo = convertNairaToKobo(params.amountRequested);
  const bopaPlatformFeeKobo = convertNairaToKobo(params.bopaPlatformFee);

  if (params.collectionMode === "manager_collects") {
    const managerAccount = await getActiveManagerPaystackAccount(
      params.supabase,
      params.organizationId,
    );

    if (!managerAccount || managerAccount.verification_status !== "verified") {
      throw new AppError(
        "MANAGER_PAYOUT_ACCOUNT_REQUIRED",
        "Set up the manager payout account before creating this payment link.",
        400,
      );
    }

    const initialized = await initializePaystackTransaction({
      email: params.customerEmail,
      amountKobo,
      reference: params.reference,
      callbackUrl: params.callbackUrl,
      subaccountCode: managerAccount.paystack_subaccount_code,
      transactionChargeKobo: bopaPlatformFeeKobo,
      currencyCode: "NGN",
      metadata: {
        ...params.metadata,
        settlement_mode: "manager_collects",
        manager_subaccount_code: managerAccount.paystack_subaccount_code,
      },
    });

    return {
      authorizationUrl: initialized.authorization_url,
      accessCode: initialized.access_code,
      reference: initialized.reference,
      settlementMetadata: {
        settlement_mode: "manager_collects",
        manager_paystack_account_id: managerAccount.id,
        manager_subaccount_code: managerAccount.paystack_subaccount_code,
      },
    };
  }

  const landlordAccount = await getActiveManagerLandlordPaystackAccount(
    params.supabase,
    {
      organizationId: params.organizationId,
      landlordClientId: params.landlordClientId,
    },
  );

  if (!landlordAccount || landlordAccount.verification_status !== "verified") {
    throw new AppError(
      "MANAGER_LANDLORD_PAYOUT_ACCOUNT_REQUIRED",
      "Set up this landlord payout account before creating this payment link.",
      400,
    );
  }

  if (
    params.collectionMode === "automatic_split" &&
    params.managerCommission > 0
  ) {
    const managerAccount = await getActiveManagerPaystackAccount(
      params.supabase,
      params.organizationId,
    );

    if (!managerAccount || managerAccount.verification_status !== "verified") {
      throw new AppError(
        "MANAGER_PAYOUT_ACCOUNT_REQUIRED",
        "Set up the manager payout account before using automatic split.",
        400,
      );
    }

    const split = await createAgentDealTransactionSplit({
      name: `BOPA Manager Rent ${params.reference}`,
      landlordSubaccountCode: landlordAccount.paystack_subaccount_code,
      landlordShareKobo: convertNairaToKobo(params.landlordShare),
      agentSubaccountCode: managerAccount.paystack_subaccount_code,
      agentShareKobo: convertNairaToKobo(params.managerCommission),
      currencyCode: "NGN",
    });

    const initialized = await initializePaystackMultiSplitTransaction({
      email: params.customerEmail,
      amountKobo,
      reference: params.reference,
      callbackUrl: params.callbackUrl,
      splitCode: split.split_code,
      currencyCode: "NGN",
      metadata: {
        ...params.metadata,
        settlement_mode: "automatic_split",
        split_code: split.split_code,
        landlord_subaccount_code: landlordAccount.paystack_subaccount_code,
        manager_subaccount_code: managerAccount.paystack_subaccount_code,
      },
    });

    return {
      authorizationUrl: initialized.authorization_url,
      accessCode: initialized.access_code,
      reference: initialized.reference,
      settlementMetadata: {
        settlement_mode: "automatic_split",
        split_code: split.split_code,
        split_id: split.id,
        landlord_paystack_account_id: landlordAccount.id,
        manager_paystack_account_id: managerAccount.id,
        landlord_subaccount_code: landlordAccount.paystack_subaccount_code,
        manager_subaccount_code: managerAccount.paystack_subaccount_code,
      },
    };
  }

  const initialized = await initializePaystackTransaction({
    email: params.customerEmail,
    amountKobo,
    reference: params.reference,
    callbackUrl: params.callbackUrl,
    subaccountCode: landlordAccount.paystack_subaccount_code,
    transactionChargeKobo: bopaPlatformFeeKobo,
    currencyCode: "NGN",
    metadata: {
      ...params.metadata,
      settlement_mode:
        params.collectionMode === "automatic_split"
          ? "landlord_direct_no_manager_fee"
          : "landlord_direct",
      landlord_subaccount_code: landlordAccount.paystack_subaccount_code,
    },
  });

  return {
    authorizationUrl: initialized.authorization_url,
    accessCode: initialized.access_code,
    reference: initialized.reference,
    settlementMetadata: {
      settlement_mode:
        params.collectionMode === "automatic_split"
          ? "landlord_direct_no_manager_fee"
          : "landlord_direct",
      landlord_paystack_account_id: landlordAccount.id,
      landlord_subaccount_code: landlordAccount.paystack_subaccount_code,
    },
  };
}

export async function expireManagerNewTenantPaymentRequestsNow() {
  await expireManagerNewTenantPaymentRequests(createSupabaseAdminClient());
}

export async function createManagerPaystackPaymentRequest(
  input: CreateManagerPaystackPaymentRequestInput,
) {
  const { supabase, profile, organization } =
    await requireManagerOrganization();

  const tenant = await getManagerTenantForPaystackRequest(supabase, {
    organizationId: organization.id,
    tenantId: input.tenantId,
  });

  if (!tenant || !isCurrentManagerTenantStatus(tenant.status)) {
    throw new AppError(
      "MANAGER_PAYSTACK_TENANT_NOT_FOUND",
      "The selected current tenant could not be found.",
      404,
    );
  }

  const property = await getManagerPropertyById(supabase, {
    organizationId: organization.id,
    landlordClientId: tenant.landlord_client_id,
    propertyId: tenant.property_id,
  });

  if (!property || property.status !== "active") {
    throw new AppError(
      "MANAGER_PAYSTACK_PROPERTY_NOT_FOUND",
      "The selected property could not be found.",
      404,
    );
  }

  const unit = await getManagerUnitById(supabase, {
    organizationId: organization.id,
    landlordClientId: tenant.landlord_client_id,
    propertyId: tenant.property_id,
    unitId: tenant.unit_id,
  });

  if (!unit || unit.status === "inactive") {
    throw new AppError(
      "MANAGER_PAYSTACK_UNIT_NOT_FOUND",
      "The selected unit could not be found.",
      404,
    );
  }

  const amountRequested = roundMoney(
    Number(tenant.current_balance) > 0
      ? Number(tenant.current_balance)
      : Number(tenant.rent_amount),
  );

  if (amountRequested <= 0) {
    throw new AppError(
      "MANAGER_PAYSTACK_AMOUNT_INVALID",
      "This tenant does not have a payable rent amount.",
      400,
    );
  }

  const breakdown = calculateManagerPaymentBreakdown({
    amountPaid: amountRequested,
    managementFeeType: property.management_fee_type,
    managementFeeValue: Number(property.management_fee_value),
  });

  const reference = generatePaystackReference();
  const token = generatePaymentToken();

  const customerEmail = resolvePaystackCustomerEmail({
    tenantEmail: tenant.email,
    tenantPhone: tenant.phone_number,
    organizationEmail: organization.organization_email,
  });

  const paymentRequest = await createPendingManagerPaystackPaymentRequest(
    supabase,
    {
      organizationId: organization.id,
      landlordClientId: tenant.landlord_client_id,
      propertyId: tenant.property_id,
      unitId: tenant.unit_id,
      tenantId: tenant.id,
      token,
      reference,
      amountRequested,
      collectionMode: property.collection_mode,
      paystackChargeBearer: property.paystack_charge_bearer,
      managementFeeType: property.management_fee_type,
      managementFeeValue: Number(property.management_fee_value),
      managementFeeAmount: breakdown.managerCommission,
      landlordNetAmount: breakdown.landlordShare,
      bopaPlatformFee: breakdown.bopaPlatformFee,
      paystackChargeAmount: breakdown.paystackCharge,
      periodStart: nullableDate(input.periodStart),
      periodEnd: nullableDate(input.periodEnd),
      tenantNameSnapshot: tenant.full_name,
      tenantPhoneSnapshot: tenant.phone_number,
      tenantEmailSnapshot: tenant.email,
      createdByProfileId: profile.id,
      notes: nullableText(input.notes),
      paymentPurpose: "rent",
      metadata: {
        product: "bopa_manager",
        payment_type: "manager_rent_payment",
        source: "bopa_manager_paystack_request",
        organization_id: organization.id,
        landlord_client_id: tenant.landlord_client_id,
        property_id: tenant.property_id,
        unit_id: tenant.unit_id,
        tenant_id: tenant.id,
        property_name_snapshot: property.property_name,
        unit_label_snapshot: unit.unit_label,
        tenant_balance_before_request: Number(tenant.current_balance),
        customer_email_used_for_paystack: customerEmail,
      },
    },
  );

  const metadata = {
    product: "bopa_manager",
    payment_type: "manager_rent_payment",
    source: "bopa_manager_paystack_request",
    manager_payment_request_id: paymentRequest.id,
    organization_id: organization.id,
    landlord_client_id: tenant.landlord_client_id,
    property_id: tenant.property_id,
    unit_id: tenant.unit_id,
    tenant_id: tenant.id,
    amount_requested: amountRequested,
    manager_commission_amount: breakdown.managerCommission,
    landlord_net_amount: breakdown.landlordShare,
    bopa_platform_fee: breakdown.bopaPlatformFee,
    paystack_charge_amount: breakdown.paystackCharge,
    property_name_snapshot: property.property_name,
    unit_label_snapshot: unit.unit_label,
  };

  const initialized = await initializeManagerPaymentSettlement({
    supabase,
    organizationId: organization.id,
    landlordClientId: tenant.landlord_client_id,
    reference,
    customerEmail,
    amountRequested,
    managerCommission: breakdown.managerCommission,
    landlordShare: breakdown.landlordShare,
    bopaPlatformFee: breakdown.bopaPlatformFee,
    collectionMode: property.collection_mode,
    callbackUrl: getManagerPaystackCallbackUrl(reference),
    metadata,
  });

  return markManagerPaystackPaymentRequestInitialized(supabase, {
    organizationId: organization.id,
    reference,
    authorizationUrl: initialized.authorizationUrl,
    accessCode: initialized.accessCode,
  });
}

export async function verifyAndPostManagerPaystackPaymentReference(params: {
  supabase?: SupabaseClient;
  reference: string;
}): Promise<ManagerPaystackVerificationResult> {
  const supabase = params.supabase ?? createSupabaseAdminClient();

  await expireManagerNewTenantPaymentRequests(supabase);

  let paymentRequest = await getManagerPaystackPaymentRequestByReference(
    supabase,
    params.reference,
  );

  if (!paymentRequest) {
    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_REQUEST_NOT_FOUND",
      "Manager payment request was not found.",
      404,
    );
  }

  if (paymentRequest.status === "paid" && paymentRequest.processed_payment_id) {
    await finalizeFirstRentPayment(supabase, {
      paymentRequest,
      paymentId: paymentRequest.processed_payment_id,
      verifiedPayload: paymentRequest.verified_payload ?? {},
      paidAt: paymentRequest.paid_at ?? new Date().toISOString(),
    });

    return {
      status: "duplicate",
      message: "Manager rent payment already recorded.",
      paymentRequestId: paymentRequest.id,
      paymentId: paymentRequest.processed_payment_id,
      verifiedPayload: paymentRequest.verified_payload ?? {},
    };
  }

  assertPaymentRequestStillPayable(paymentRequest);
  await assertFirstRentPaymentStillValid(supabase, paymentRequest);

  paymentRequest = await getManagerPaystackPaymentRequestByReference(
    supabase,
    params.reference,
  );

  if (!paymentRequest) {
    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_REQUEST_NOT_FOUND",
      "Manager payment request was not found.",
      404,
    );
  }

  assertPaymentRequestStillPayable(paymentRequest);
  await assertFirstRentPaymentStillValid(supabase, paymentRequest);

  const verifiedTransaction = await verifyPaystackTransaction(params.reference);
  const verifiedPayload = toRecord(verifiedTransaction);

  paymentRequest = await getManagerPaystackPaymentRequestByReference(
    supabase,
    params.reference,
  );

  if (!paymentRequest) {
    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_REQUEST_NOT_FOUND",
      "Manager payment request was not found.",
      404,
    );
  }

  if (paymentRequest.status === "paid" && paymentRequest.processed_payment_id) {
    await finalizeFirstRentPayment(supabase, {
      paymentRequest,
      paymentId: paymentRequest.processed_payment_id,
      verifiedPayload: paymentRequest.verified_payload ?? verifiedPayload,
      paidAt: paymentRequest.paid_at ?? new Date().toISOString(),
    });

    return {
      status: "duplicate",
      message: "Manager rent payment already recorded.",
      paymentRequestId: paymentRequest.id,
      paymentId: paymentRequest.processed_payment_id,
      verifiedPayload,
    };
  }

  assertPaymentRequestStillPayable(paymentRequest);
  await assertFirstRentPaymentStillValid(supabase, paymentRequest);

  if (verifiedTransaction.reference !== paymentRequest.reference) {
    throw new AppError(
      "MANAGER_PAYSTACK_REFERENCE_MISMATCH",
      "Payment reference does not match the initialized manager payment.",
      400,
    );
  }

  if (verifiedTransaction.currency !== paymentRequest.currency_code) {
    throw new AppError(
      "MANAGER_PAYSTACK_CURRENCY_MISMATCH",
      "Payment currency does not match the initialized manager payment.",
      400,
    );
  }

  if (verifiedTransaction.status !== "success") {
    await markManagerPaystackPaymentRequestFailed(supabase, {
      requestId: paymentRequest.id,
      failureReason: `Paystack transaction status: ${verifiedTransaction.status}`,
      verifiedPayload,
      metadata: {
        ...paymentRequest.metadata,
        paystack_status: verifiedTransaction.status,
      },
    });

    throw new AppError(
      "MANAGER_PAYSTACK_PAYMENT_NOT_SUCCESSFUL",
      "Manager rent payment was not successful.",
      400,
    );
  }

  assertPaymentRequestStillPayable(paymentRequest);
  await assertFirstRentPaymentStillValid(supabase, paymentRequest);

  assertPaystackAmountMatchesExpected({
    paystackAmountInKobo: verifiedTransaction.amount,
    expectedAmountInNaira: Number(paymentRequest.amount_requested),
  });

  const existingPayment = await getManagerRentPaymentByPaymentReference(
    supabase,
    paymentRequest.reference,
  );

  if (existingPayment) {
    await markManagerPaystackPaymentRequestPaid(supabase, {
      requestId: paymentRequest.id,
      processedPaymentId: existingPayment.id,
      paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
      verifiedPayload,
      metadata: {
        ...paymentRequest.metadata,
        duplicate_payment_detected: true,
      },
    });

    await finalizeFirstRentPayment(supabase, {
      paymentRequest,
      paymentId: existingPayment.id,
      verifiedPayload,
      paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
    });

    return {
      status: "duplicate",
      message: "Manager rent payment already recorded.",
      paymentRequestId: paymentRequest.id,
      paymentId: existingPayment.id,
      verifiedPayload,
    };
  }

  if (!paymentRequest.created_by_profile_id) {
    throw new AppError(
      "MANAGER_PAYSTACK_CREATOR_MISSING",
      "Payment request creator is missing.",
      500,
    );
  }

  const tenant = await getManagerTenantForPaystackRequest(supabase, {
    organizationId: paymentRequest.organization_id,
    tenantId: paymentRequest.tenant_id,
  });

  const rentPayment = await recordManagerRentPaymentRecord(supabase, {
    organizationId: paymentRequest.organization_id,
    landlordClientId: paymentRequest.landlord_client_id,
    propertyId: paymentRequest.property_id,
    unitId: paymentRequest.unit_id,
    tenantId: paymentRequest.tenant_id,
    collectionMode: paymentRequest.collection_mode,
    paymentReceiver: "bopa_verified",
    paystackChargeBearer: paymentRequest.paystack_charge_bearer,
    amountPaid: Number(paymentRequest.amount_requested),
    paymentMethod: "other",
    paymentReference: paymentRequest.reference,
    paymentDate:
      verifiedTransaction.paid_at?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
    periodStart: paymentRequest.period_start,
    periodEnd: paymentRequest.period_end,
    managementFeeType: paymentRequest.management_fee_type,
    managementFeeValue: Number(paymentRequest.management_fee_value),
    managementFeeAmount: Number(paymentRequest.management_fee_amount),
    landlordNetAmount: Number(paymentRequest.landlord_net_amount),
    status: "verified",
    recordedByProfileId: paymentRequest.created_by_profile_id,
    notes: paymentRequest.notes,
    metadata: {
      source: "bopa_manager_paystack_webhook",
      payment_request_id: paymentRequest.id,
      payment_purpose: paymentRequest.payment_purpose,
      onboarding_request_id: paymentRequest.onboarding_request_id,
      agreement_document_id: paymentRequest.agreement_document_id,
      paystack_reference: paymentRequest.reference,
      tenant_balance_before_payment: Number(tenant?.current_balance ?? 0),
      manager_commission: Number(paymentRequest.management_fee_amount),
      landlord_share: Number(paymentRequest.landlord_net_amount),
      bopa_platform_fee: Number(paymentRequest.bopa_platform_fee),
      paystack_charge: Number(paymentRequest.paystack_charge_amount),
      collection_mode_snapshot: paymentRequest.collection_mode,
      payment_receiver_snapshot: "bopa_verified",
      paystack_charge_bearer_snapshot: paymentRequest.paystack_charge_bearer,
      management_fee_type_snapshot: paymentRequest.management_fee_type,
      management_fee_value_snapshot: Number(
        paymentRequest.management_fee_value,
      ),
      verified_payload: verifiedPayload,
    },
  });

  await markManagerPaystackPaymentRequestPaid(supabase, {
    requestId: paymentRequest.id,
    processedPaymentId: rentPayment.id,
    paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
    verifiedPayload,
    metadata: {
      ...paymentRequest.metadata,
      processed_payment_id: rentPayment.id,
      paid_via: "central_paystack_payment_confirmation",
    },
  });

  await finalizeFirstRentPayment(supabase, {
    paymentRequest,
    paymentId: rentPayment.id,
    verifiedPayload,
    paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
  });

  return {
    status: "processed",
    message: "Manager rent payment confirmed.",
    paymentRequestId: paymentRequest.id,
    paymentId: rentPayment.id,
    verifiedPayload,
  };
}

export async function getManagerPaystackCallbackState(reference: string) {
  try {
    const result = await verifyAndPostManagerPaystackPaymentReference({
      reference,
      supabase: createSupabaseAdminClient(),
    });

    return {
      ok: true,
      status: result.status,
      message: result.message,
    };
  } catch (error) {
    if (isManagerPaymentNotFoundError(error)) {
      return {
        ok: false,
        status: "not_found" as const,
        message: "Payment request was not found.",
      };
    }

    if (isManagerPaymentExpiredError(error)) {
      return {
        ok: false,
        status: "expired" as const,
        message:
          "This payment link has expired. Please ask the property manager for a new link.",
      };
    }

    if (isAppError(error)) {
      return {
        ok: false,
        status: "failed" as const,
        message: error.userMessage,
      };
    }

    return {
      ok: false,
      status: "failed" as const,
      message: "Payment could not be verified.",
    };
  }
}
