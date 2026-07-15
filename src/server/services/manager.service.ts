import "server-only";

import type {
  ManagerCollectionMode,
  ManagerPaymentReceiver,
  ManagerRentPaymentStatus,
} from "@/constants/manager";
import { AppError } from "@/server/errors/app-error";
import {
  createManagerLandlordClient as createManagerLandlordClientRecord,
  createManagerOrganization as createManagerOrganizationRecord,
  createManagerProperty as createManagerPropertyRecord,
  createManagerUnit as createManagerUnitRecord,
  getManagerOrganizationForCurrentUser,
  getManagerOverview as getManagerOverviewRecord,
  getManagerPropertyById,
  getManagerTenantById,
  getManagerUnitById,
  isCurrentManagerTenantStatus,
  markManagerPropertyExistingTenantSetupCompleted,
  recordManagerLandlordRemittance as recordManagerLandlordRemittanceRecord,
  recordManagerRentPayment as recordManagerRentPaymentRecord,
  upsertLandlordPayoutProfile,
} from "@/server/repositories/manager.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type {
  CreateManagerLandlordClientInput,
  CreateManagerOrganizationInput,
  CreateManagerPropertyInput,
  CreateManagerTenantInput,
  CreateManagerUnitInput,
  CompleteManagerExistingTenantSetupInput,
  RecordManagerLandlordRemittanceInput,
  RecordManagerRentPaymentInput,
  SaveManagerLandlordPayoutProfileInput,
} from "@/server/validators/manager.schema";

type ManagerProfileRow = {
  id: string;
  role: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  is_active: boolean;
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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getManualPaymentStatus(params: {
  collectionMode: ManagerCollectionMode;
  paymentReceiver: ManagerPaymentReceiver;
}): ManagerRentPaymentStatus {
  if (
    params.collectionMode === "manager_collects" &&
    params.paymentReceiver === "manager"
  ) {
    return "recorded";
  }

  return "pending_confirmation";
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

function calculatePaymentShares(params: {
  amountPaid: number;
  managementFeeType: "percentage" | "flat";
  managementFeeValue: number;
}) {
  const bopaPlatformFee = 0;
  const paystackCharge = 0;

  const managerCommission =
    params.managementFeeType === "percentage"
      ? roundMoney((params.amountPaid * params.managementFeeValue) / 100)
      : roundMoney(Math.min(params.managementFeeValue, params.amountPaid));

  const landlordShare = roundMoney(
    params.amountPaid - managerCommission - bopaPlatformFee - paystackCharge,
  );

  if (landlordShare < 0) {
    throw new AppError(
      "MANAGER_PAYMENT_NEGATIVE_LANDLORD_SHARE",
      "Landlord share cannot be negative.",
      400,
    );
  }

  return {
    managerCommission,
    bopaPlatformFee,
    paystackCharge,
    landlordShare,
  };
}

export async function createManagerOrganization(
  input: CreateManagerOrganizationInput,
) {
  const { supabase, profile } = await getCurrentManagerProfile();

  const existingOrganization = await getManagerOrganizationForCurrentUser(
    supabase,
    profile.id,
  );

  if (existingOrganization) {
    throw new AppError(
      "MANAGER_ORGANIZATION_ALREADY_EXISTS",
      "Your manager organization has already been created.",
      409,
    );
  }

  return createManagerOrganizationRecord(supabase, {
    ownerProfileId: profile.id,
    organizationName: input.organizationName,
    organizationPhone: nullableText(input.organizationPhone),
    organizationEmail: nullableText(input.organizationEmail),
    rcNumber: nullableText(input.rcNumber),
    officeAddress: nullableText(input.officeAddress),
  });
}

export async function createManagerLandlordClient(
  input: CreateManagerLandlordClientInput,
) {
  const { supabase, organization } = await requireManagerOrganization();

  return createManagerLandlordClientRecord(supabase, {
    organizationId: organization.id,
    landlordName: input.landlordName,
    landlordPhone: nullableText(input.landlordPhone),
    landlordEmail: nullableText(input.landlordEmail),
    landlordAddress: nullableText(input.landlordAddress),
    notes: nullableText(input.notes),
  });
}

export async function saveManagerLandlordPayoutProfile(
  input: SaveManagerLandlordPayoutProfileInput,
) {
  const { supabase, organization } = await requireManagerOrganization();

  return upsertLandlordPayoutProfile(supabase, {
    id: input.payoutProfileId ?? null,
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    paymentReceiver: input.paymentReceiver,
    receiverName: input.receiverName,
    receiverPhone: nullableText(input.receiverPhone),
    bankName: nullableText(input.bankName),
    bankCode: nullableText(input.bankCode),
    accountNumber: nullableText(input.accountNumber),
    accountName: nullableText(input.accountName),
    payoutNote: nullableText(input.payoutNote),
    isDefault: input.isDefault,
  });
}

export async function createManagerProperty(input: CreateManagerPropertyInput) {
  const { supabase, organization } = await requireManagerOrganization();

  return createManagerPropertyRecord(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyName: input.propertyName,
    propertyAddress: input.propertyAddress,
    city: nullableText(input.city),
    state: nullableText(input.state),
    lga: nullableText(input.lga),
    collectionMode: input.collectionMode,
    managementFeeType: input.managementFeeType,
    managementFeeValue: roundMoney(input.managementFeeValue),
    paystackChargeBearer: input.paystackChargeBearer,
    paymentReceiver: input.paymentReceiver,
    hasExistingTenants: input.hasExistingTenants,
    notes: nullableText(input.notes),
  });
}

export async function completeManagerExistingTenantSetup(
  input: CompleteManagerExistingTenantSetupInput,
) {
  const { supabase, profile, organization } = await requireManagerOrganization();

  return markManagerPropertyExistingTenantSetupCompleted(supabase, {
    organizationId: organization.id,
    propertyId: input.propertyId,
    completedByProfileId: profile.id,
  });
}

export async function createManagerUnit(input: CreateManagerUnitInput) {
  const { supabase, organization } = await requireManagerOrganization();

  const property = await getManagerPropertyById(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
  });

  if (!property || property.status !== "active") {
    throw new AppError(
      "MANAGER_PROPERTY_NOT_FOUND",
      "The selected property could not be found.",
      404,
    );
  }

  return createManagerUnitRecord(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
    unitLabel: input.unitLabel,
    unitType: nullableText(input.unitType),
    rentAmount: roundMoney(input.rentAmount),
    status: "vacant",
    notes: nullableText(input.notes),
  });
}

export async function createManagerTenant(input: CreateManagerTenantInput) {
  void input;
  await requireManagerOrganization();

  throw new AppError(
    "MANAGER_TENANT_DIRECT_CREATE_DISABLED",
    "Start tenant onboarding from a specific property unit.",
    400,
  );
}

export async function recordManagerRentPayment(
  input: RecordManagerRentPaymentInput,
) {
  const { supabase, profile, organization } =
    await requireManagerOrganization();

  const property = await getManagerPropertyById(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
  });

  if (!property || property.status !== "active") {
    throw new AppError(
      "MANAGER_PAYMENT_PROPERTY_NOT_FOUND",
      "The selected property could not be found.",
      404,
    );
  }

  const unit = await getManagerUnitById(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
    unitId: input.unitId,
  });

  if (!unit || unit.status === "inactive") {
    throw new AppError(
      "MANAGER_PAYMENT_UNIT_NOT_FOUND",
      "The selected unit could not be found.",
      404,
    );
  }

  const tenant = await getManagerTenantById(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
    unitId: input.unitId,
    tenantId: input.tenantId,
  });

  if (!tenant || !isCurrentManagerTenantStatus(tenant.status)) {
    throw new AppError(
      "MANAGER_PAYMENT_TENANT_NOT_ACTIVE",
      "The selected tenant is not current.",
      400,
    );
  }

  const amountPaid = roundMoney(input.amountPaid);

  const shares = calculatePaymentShares({
    amountPaid,
    managementFeeType: property.management_fee_type,
    managementFeeValue: Number(property.management_fee_value),
  });

  const paymentStatus = getManualPaymentStatus({
    collectionMode: property.collection_mode,
    paymentReceiver: input.paymentReceiver,
  });

  return recordManagerRentPaymentRecord(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
    unitId: input.unitId,
    tenantId: input.tenantId,
    collectionMode: property.collection_mode,
    paymentReceiver: input.paymentReceiver,
    paystackChargeBearer: property.paystack_charge_bearer,
    amountPaid,
    paymentMethod: input.paymentMethod,
    paymentReference: nullableText(input.paymentReference),
    paymentDate: input.paymentDate,
    periodStart: nullableDate(input.periodStart),
    periodEnd: nullableDate(input.periodEnd),
    managementFeeType: property.management_fee_type,
    managementFeeValue: Number(property.management_fee_value),
    managementFeeAmount: shares.managerCommission,
    landlordNetAmount: shares.landlordShare,
    status: paymentStatus,
    recordedByProfileId: profile.id,
    notes: nullableText(input.notes),
    metadata: {
      source: "bopa_manager_manual_payment",
      proof_url: nullableText(input.proofUrl),
      manager_commission: shares.managerCommission,
      landlord_share: shares.landlordShare,
      bopa_platform_fee: shares.bopaPlatformFee,
      paystack_charge: shares.paystackCharge,
      collection_mode_snapshot: property.collection_mode,
      payment_receiver_snapshot: input.paymentReceiver,
      paystack_charge_bearer_snapshot: property.paystack_charge_bearer,
      management_fee_type_snapshot: property.management_fee_type,
      management_fee_value_snapshot: Number(property.management_fee_value),
    },
  });
}

export async function recordManagerLandlordRemittance(
  input: RecordManagerLandlordRemittanceInput,
) {
  const { supabase, profile, organization } =
    await requireManagerOrganization();

  return recordManagerLandlordRemittanceRecord(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    payoutProfileId: input.payoutProfileId ?? null,
    amountRemitted: roundMoney(input.amountRemitted),
    remittanceDate: input.remittanceDate,
    periodStart: nullableDate(input.periodStart),
    periodEnd: nullableDate(input.periodEnd),
    paymentMethod: input.paymentMethod,
    paymentReference: nullableText(input.paymentReference),
    proofUrl: nullableText(input.proofUrl),
    status: "recorded",
    recordedByProfileId: profile.id,
    notes: nullableText(input.notes),
    metadata: {
      source: "bopa_manager_manual_landlord_remittance",
    },
  });
}

export async function getManagerOverview() {
  const { supabase, profile } = await getCurrentManagerProfile();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    profile.id,
  );

  if (!organization || organization.status !== "active") {
    return null;
  }

  return getManagerOverviewRecord(supabase, organization.id);
}
