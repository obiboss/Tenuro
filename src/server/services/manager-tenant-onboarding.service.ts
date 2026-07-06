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
} from "@/server/repositories/manager.repository";
import {
  createManagerTenantAgreementDocument,
  createManagerTenantOnboardingRequest,
  getManagerTenantAgreementByTokenHash,
  getManagerTenantOnboardingRequestById,
  getManagerTenantOnboardingRequestByTokenHash,
  markManagerOnboardingAgreementAccepted,
  markManagerOnboardingPaymentInitialized,
  submitManagerTenantOnboardingRequest,
  updateManagerTenantOnboardingRequestReviewed,
  updateManagerUnitStatusDirect,
  type ManagerTenantAgreementDocumentRow,
  type ManagerTenantOnboardingRequestRow,
} from "@/server/repositories/manager-tenant-onboarding.repository";
import {
  getActiveManagerLandlordPaystackAccount,
  getActiveManagerPaystackAccount,
} from "@/server/repositories/manager-paystack-accounts.repository";
import {
  convertNairaToKobo,
  createAgentDealTransactionSplit,
  initializePaystackMultiSplitTransaction,
  initializePaystackTransaction,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type {
  AcceptManagerTenantAgreementInput,
  ApproveManagerTenantOnboardingRequestInput,
  CreateManagerTenantOnboardingRequestInput,
  RejectManagerTenantOnboardingRequestInput,
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
    "After acceptance, your secure rent payment link will be shown.",
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

function buildAgreementBody(params: {
  organizationName: string;
  landlordName: string;
  tenantName: string;
  propertyName: string;
  propertyAddress: string;
  unitLabel: string;
  rentAmount: number;
  moveInDate: string;
  nextRentDueDate: string;
}) {
  return [
    "TENANCY AGREEMENT",
    "",
    `This tenancy agreement is prepared by ${params.organizationName} on behalf of ${params.landlordName}.`,
    "",
    `Tenant: ${params.tenantName}`,
    `Property: ${params.propertyName}`,
    `Address: ${params.propertyAddress}`,
    `Unit: ${params.unitLabel}`,
    `Rent Amount: NGN ${params.rentAmount.toLocaleString("en-NG")}`,
    `Move-in Date: ${params.moveInDate}`,
    `Next Rent Due Date: ${params.nextRentDueDate}`,
    "",
    "The tenant agrees to occupy the property peacefully, pay rent as agreed, keep the unit in good condition, and comply with lawful property rules.",
    "",
    "The property manager will keep rent, payment, and tenancy records on BOPA Manager.",
    "",
    "Digital acceptance of this agreement confirms that the tenant has read and accepted the terms.",
  ].join("\n");
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
      collection_mode: property.collection_mode,
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

  const amountKobo = convertNairaToKobo(params.rentAmount);
  const callbackUrl = getManagerPaystackCallbackUrl(reference);

  let authorizationUrl: string;
  let accessCode: string;

  if (property.collection_mode === "manager_collects") {
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
      email: customerEmail,
      amountKobo,
      reference,
      callbackUrl,
      subaccountCode: managerAccount.paystack_subaccount_code,
      transactionChargeKobo: convertNairaToKobo(breakdown.bopaPlatformFee),
      currencyCode: "NGN",
      metadata,
    });

    authorizationUrl = initialized.authorization_url;
    accessCode = initialized.access_code;
  } else {
    const landlordAccount = await getActiveManagerLandlordPaystackAccount(
      params.supabase,
      {
        organizationId: params.organizationId,
        landlordClientId: params.landlordClientId,
      },
    );

    if (
      !landlordAccount ||
      landlordAccount.verification_status !== "verified"
    ) {
      throw new AppError(
        "MANAGER_LANDLORD_PAYOUT_ACCOUNT_REQUIRED",
        "Set up this landlord payout account before creating this payment link.",
        400,
      );
    }

    if (
      property.collection_mode === "automatic_split" &&
      breakdown.managerCommission > 0
    ) {
      const managerAccount = await getActiveManagerPaystackAccount(
        params.supabase,
        params.organizationId,
      );

      if (
        !managerAccount ||
        managerAccount.verification_status !== "verified"
      ) {
        throw new AppError(
          "MANAGER_PAYOUT_ACCOUNT_REQUIRED",
          "Set up the manager payout account before automatic split.",
          400,
        );
      }

      const split = await createAgentDealTransactionSplit({
        name: `BOPA Manager First Rent ${reference}`,
        landlordSubaccountCode: landlordAccount.paystack_subaccount_code,
        landlordShareKobo: convertNairaToKobo(breakdown.landlordShare),
        agentSubaccountCode: managerAccount.paystack_subaccount_code,
        agentShareKobo: convertNairaToKobo(breakdown.managerCommission),
        currencyCode: "NGN",
      });

      const initialized = await initializePaystackMultiSplitTransaction({
        email: customerEmail,
        amountKobo,
        reference,
        callbackUrl,
        splitCode: split.split_code,
        currencyCode: "NGN",
        metadata: {
          ...metadata,
          split_code: split.split_code,
        },
      });

      authorizationUrl = initialized.authorization_url;
      accessCode = initialized.access_code;
    } else {
      const initialized = await initializePaystackTransaction({
        email: customerEmail,
        amountKobo,
        reference,
        callbackUrl,
        subaccountCode: landlordAccount.paystack_subaccount_code,
        transactionChargeKobo: convertNairaToKobo(breakdown.bopaPlatformFee),
        currencyCode: "NGN",
        metadata,
      });

      authorizationUrl = initialized.authorization_url;
      accessCode = initialized.access_code;
    }
  }

  const { data: initializedRequest, error: updateError } = await params.supabase
    .from("manager_rent_payment_requests")
    .update({
      authorization_url: authorizationUrl,
      access_code: accessCode,
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
  };
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

  return submitManagerTenantOnboardingRequest(supabase, {
    requestId: request.id,
    fullName: input.fullName,
    phoneNumber: phone.e164,
    email: input.email?.trim().toLowerCase() ?? null,
    occupation: nullableText(input.occupation),
    idType: input.idType,
    idNumber: input.idNumber,
    moveInDate: input.moveInDate,
    statedRentDueDate: input.statedRentDueDate,
    claimedRentAmount: input.claimedRentAmount,
    paymentFrequency: input.paymentFrequency,
    tenantNotes: nullableText(input.tenantNotes),
  });
}

export async function approveManagerTenantOnboardingRequestForCurrentManager(
  input: ApproveManagerTenantOnboardingRequestInput,
) {
  const { supabase, profile, organization } =
    await requireManagerOrganization();
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

  if (
    !request.tenant_full_name ||
    !request.tenant_phone_number ||
    !request.tenant_move_in_date ||
    !request.tenant_claimed_rent_amount
  ) {
    throw new AppError(
      "MANAGER_ONBOARDING_DETAILS_MISSING",
      "The tenant details are incomplete.",
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
    rentAmount: roundMoney(input.confirmedRentAmount),
    currentBalance: roundMoney(input.openingBalance),
    moveInDate: input.confirmedMoveInDate,
    nextRentDueDate: input.confirmedNextRentDueDate,
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
      confirmedRentAmount: input.confirmedRentAmount,
      confirmedMoveInDate: input.confirmedMoveInDate,
      confirmedNextRentDueDate: input.confirmedNextRentDueDate,
      openingBalance: input.openingBalance,
      reviewNotes: nullableText(input.reviewNotes),
      metadata: {
        ...request.metadata,
        approved_as: "current_occupant",
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

  const agreementBody = buildAgreementBody({
    organizationName: organization.organization_name,
    landlordName,
    tenantName: tenant.full_name,
    propertyName,
    propertyAddress,
    unitLabel,
    rentAmount: input.confirmedRentAmount,
    moveInDate: input.confirmedMoveInDate,
    nextRentDueDate: input.confirmedNextRentDueDate,
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
      rentAmount: input.confirmedRentAmount,
      moveInDate: input.confirmedMoveInDate,
      nextRentDueDate: input.confirmedNextRentDueDate,
      openingBalance: input.openingBalance,
    },
    metadata: {
      onboarding_request_id: request.id,
      source: "bopa_manager_new_incoming_tenant",
    },
  });

  await updateManagerTenantOnboardingRequestReviewed(adminSupabase, {
    requestId: request.id,
    organizationId: organization.id,
    status: approvedStatus,
    approvedTenantId: tenant.id,
    approvedByProfileId: profile.id,
    confirmedRentAmount: input.confirmedRentAmount,
    confirmedMoveInDate: input.confirmedMoveInDate,
    confirmedNextRentDueDate: input.confirmedNextRentDueDate,
    openingBalance: input.openingBalance,
    reviewNotes: nullableText(input.reviewNotes),
    metadata: {
      ...request.metadata,
      approved_as: "new_incoming_tenant",
      agreement_id: agreement.id,
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
  const { supabase, profile, organization } =
    await requireManagerOrganization();
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
    reviewNotes: null,
    rejectionReason: input.reason,
    metadata: {
      ...request.metadata,
      rejected_at: new Date().toISOString(),
    },
  });
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
    new Date(agreement.tenant_acceptance_token_expires_at).getTime() <
    Date.now()
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

  if (agreement.document_status === "accepted") {
    const requestId = agreement.onboarding_request_id;

    if (!requestId) {
      throw new AppError(
        "MANAGER_ONBOARDING_REQUEST_MISSING",
        "The onboarding request is missing.",
        500,
      );
    }

    const { data, error } = await supabase
      .from("manager_rent_payment_requests")
      .select("authorization_url, expires_at")
      .eq("agreement_document_id", agreement.id)
      .eq("payment_purpose", "new_tenant_first_rent")
      .in("status", ["pending", "initialized"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        authorization_url: string | null;
        expires_at: string | null;
      }>();

    if (error) {
      throw error;
    }

    return {
      agreement,
      paymentUrl: data?.authorization_url ?? null,
      paymentExpiresAt: data?.expires_at ?? null,
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

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: acceptedAgreement.organization_id,
    requestId: acceptedAgreement.onboarding_request_id,
  });

  const payment = await initializeFirstRentPayment({
    supabase,
    organizationId: acceptedAgreement.organization_id,
    organizationEmail:
      request.manager_organizations?.organization_email ?? null,
    landlordClientId: acceptedAgreement.landlord_client_id,
    propertyId: acceptedAgreement.property_id,
    unitId: acceptedAgreement.unit_id,
    tenantId: acceptedAgreement.tenant_id,
    agreementId: acceptedAgreement.id,
    onboardingRequestId: acceptedAgreement.onboarding_request_id,
    tenantName:
      typeof acceptedAgreement.tenant_snapshot.fullName === "string"
        ? acceptedAgreement.tenant_snapshot.fullName
        : "Tenant",
    tenantPhone:
      typeof acceptedAgreement.tenant_snapshot.phoneNumber === "string"
        ? acceptedAgreement.tenant_snapshot.phoneNumber
        : "",
    tenantEmail:
      typeof acceptedAgreement.tenant_snapshot.email === "string"
        ? acceptedAgreement.tenant_snapshot.email
        : null,
    rentAmount:
      typeof acceptedAgreement.tenancy_snapshot.rentAmount === "number"
        ? acceptedAgreement.tenancy_snapshot.rentAmount
        : Number(request.manager_confirmed_rent_amount ?? 0),
    periodStart:
      typeof acceptedAgreement.tenancy_snapshot.moveInDate === "string"
        ? acceptedAgreement.tenancy_snapshot.moveInDate
        : null,
    periodEnd:
      typeof acceptedAgreement.tenancy_snapshot.nextRentDueDate === "string"
        ? acceptedAgreement.tenancy_snapshot.nextRentDueDate
        : null,
    createdByProfileId:
      acceptedAgreement.finalized_by_profile_id ??
      request.approved_by_profile_id ??
      acceptedAgreement.tenant_id,
  });

  return {
    agreement: acceptedAgreement,
    paymentUrl: payment.paymentUrl,
    paymentExpiresAt: payment.paymentExpiresAt,
  };
}
