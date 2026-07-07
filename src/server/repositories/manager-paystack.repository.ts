import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ManagerCollectionMode,
  ManagerManagementFeeType,
  ManagerPaymentReceiver,
  ManagerPaystackChargeBearer,
  ManagerTenantStatus,
} from "@/constants/manager";

export type ManagerRentPaymentRequestStatus =
  | "pending"
  | "initialized"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

export type ManagerPaymentPurpose = "rent" | "new_tenant_first_rent";

export type ManagerPaystackPaymentTenantRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  rent_amount: number;
  current_balance: number;
  status: ManagerTenantStatus;
};

export type ManagerRentPaymentRequestRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  token: string;
  reference: string;
  amount_requested: number;
  currency_code: "NGN";
  collection_mode: ManagerCollectionMode;
  payment_receiver: ManagerPaymentReceiver;
  paystack_charge_bearer: ManagerPaystackChargeBearer;
  management_fee_type: ManagerManagementFeeType;
  management_fee_value: number;
  management_fee_amount: number;
  landlord_net_amount: number;
  bopa_platform_fee: number;
  paystack_charge_amount: number;
  period_start: string | null;
  period_end: string | null;
  tenant_name_snapshot: string;
  tenant_phone_snapshot: string;
  tenant_email_snapshot: string | null;
  authorization_url: string | null;
  access_code: string | null;
  status: ManagerRentPaymentRequestStatus;
  initialized_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
  processed_payment_id: string | null;
  verified_payload: Record<string, unknown>;
  failure_reason: string | null;
  created_by_profile_id: string | null;
  notes: string | null;
  onboarding_request_id: string | null;
  agreement_document_id: string | null;
  payment_purpose: ManagerPaymentPurpose;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const MANAGER_PAYSTACK_PAYMENT_TENANT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_id,
  full_name,
  phone_number,
  email,
  rent_amount,
  current_balance,
  status
`;

const MANAGER_RENT_PAYMENT_REQUEST_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_id,
  tenant_id,
  token,
  reference,
  amount_requested,
  currency_code,
  collection_mode,
  payment_receiver,
  paystack_charge_bearer,
  management_fee_type,
  management_fee_value,
  management_fee_amount,
  landlord_net_amount,
  bopa_platform_fee,
  paystack_charge_amount,
  period_start,
  period_end,
  tenant_name_snapshot,
  tenant_phone_snapshot,
  tenant_email_snapshot,
  authorization_url,
  access_code,
  status,
  initialized_at,
  paid_at,
  failed_at,
  cancelled_at,
  expires_at,
  processed_payment_id,
  verified_payload,
  failure_reason,
  created_by_profile_id,
  notes,
  onboarding_request_id,
  agreement_document_id,
  payment_purpose,
  metadata,
  created_at,
  updated_at
`;

export async function expireManagerNewTenantPaymentRequests(
  supabase: SupabaseClient,
) {
  const { error } = await supabase.rpc(
    "expire_manager_new_tenant_payment_requests",
  );

  if (error) {
    throw error;
  }
}

export async function getManagerTenantForPaystackRequest(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    tenantId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenants")
    .select(MANAGER_PAYSTACK_PAYMENT_TENANT_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("id", params.tenantId)
    .maybeSingle<ManagerPaystackPaymentTenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createPendingManagerPaystackPaymentRequest(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
    tenantId: string;
    token: string;
    reference: string;
    amountRequested: number;
    collectionMode: ManagerCollectionMode;
    paystackChargeBearer: ManagerPaystackChargeBearer;
    managementFeeType: ManagerManagementFeeType;
    managementFeeValue: number;
    managementFeeAmount: number;
    landlordNetAmount: number;
    bopaPlatformFee: number;
    paystackChargeAmount: number;
    periodStart: string | null;
    periodEnd: string | null;
    tenantNameSnapshot: string;
    tenantPhoneSnapshot: string;
    tenantEmailSnapshot: string | null;
    createdByProfileId: string;
    notes: string | null;
    expiresAt?: string | null;
    onboardingRequestId?: string | null;
    agreementDocumentId?: string | null;
    paymentPurpose?: ManagerPaymentPurpose;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_rent_payment_requests")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      tenant_id: params.tenantId,
      token: params.token,
      reference: params.reference,
      amount_requested: params.amountRequested,
      currency_code: "NGN",
      collection_mode: params.collectionMode,
      payment_receiver: "bopa_verified",
      paystack_charge_bearer: params.paystackChargeBearer,
      management_fee_type: params.managementFeeType,
      management_fee_value: params.managementFeeValue,
      management_fee_amount: params.managementFeeAmount,
      landlord_net_amount: params.landlordNetAmount,
      bopa_platform_fee: params.bopaPlatformFee,
      paystack_charge_amount: params.paystackChargeAmount,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      tenant_name_snapshot: params.tenantNameSnapshot,
      tenant_phone_snapshot: params.tenantPhoneSnapshot,
      tenant_email_snapshot: params.tenantEmailSnapshot,
      status: "pending",
      expires_at: params.expiresAt ?? null,
      created_by_profile_id: params.createdByProfileId,
      notes: params.notes,
      onboarding_request_id: params.onboardingRequestId ?? null,
      agreement_document_id: params.agreementDocumentId ?? null,
      payment_purpose: params.paymentPurpose ?? "rent",
      metadata: params.metadata,
    })
    .select(MANAGER_RENT_PAYMENT_REQUEST_SELECT)
    .single<ManagerRentPaymentRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markManagerPaystackPaymentRequestInitialized(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    reference: string;
    authorizationUrl: string;
    accessCode: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_rent_payment_requests")
    .update({
      authorization_url: params.authorizationUrl,
      access_code: params.accessCode,
      status: "initialized",
      initialized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("reference", params.reference)
    .select(MANAGER_RENT_PAYMENT_REQUEST_SELECT)
    .single<ManagerRentPaymentRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerPaystackPaymentRequestByReference(
  supabase: SupabaseClient,
  reference: string,
) {
  const { data, error } = await supabase
    .from("manager_rent_payment_requests")
    .select(MANAGER_RENT_PAYMENT_REQUEST_SELECT)
    .eq("reference", reference)
    .maybeSingle<ManagerRentPaymentRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markManagerPaystackPaymentRequestPaid(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    processedPaymentId: string;
    paidAt: string;
    verifiedPayload: Record<string, unknown>;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_rent_payment_requests")
    .update({
      status: "paid",
      paid_at: params.paidAt,
      processed_payment_id: params.processedPaymentId,
      verified_payload: params.verifiedPayload,
      failure_reason: null,
      metadata: params.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.requestId)
    .neq("status", "expired")
    .select(MANAGER_RENT_PAYMENT_REQUEST_SELECT)
    .single<ManagerRentPaymentRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markManagerPaystackPaymentRequestFailed(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    failureReason: string;
    verifiedPayload: Record<string, unknown>;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_rent_payment_requests")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      failure_reason: params.failureReason,
      verified_payload: params.verifiedPayload,
      metadata: params.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.requestId)
    .select(MANAGER_RENT_PAYMENT_REQUEST_SELECT)
    .single<ManagerRentPaymentRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerPaystackPaymentRequests(
  supabase: SupabaseClient,
  organizationId: string,
) {
  await expireManagerNewTenantPaymentRequests(supabase);

  const { data, error } = await supabase
    .from("manager_rent_payment_requests")
    .select(MANAGER_RENT_PAYMENT_REQUEST_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ManagerRentPaymentRequestRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerRentPaymentByPaymentReference(
  supabase: SupabaseClient,
  paymentReference: string,
) {
  const { data, error } = await supabase
    .from("manager_rent_payments")
    .select("id")
    .eq("payment_reference", paymentReference)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return data;
}
