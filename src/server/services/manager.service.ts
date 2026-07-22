import "server-only";

import {
  calculateCurrentRentCycle,
  calculateCurrentRentDueDate,
  calculateRentPeriodFromStart,
} from "@/lib/rent-cycle";
import crypto from "node:crypto";
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
  createManagerPropertyRules,
  deleteManagerProperty as deleteManagerPropertyRecord,
  createManagerPropertyServiceCharges,
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
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import { assertBusinessSubscriptionAccessForProfile } from "@/server/services/business-subscription.service";
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

  await assertBusinessSubscriptionAccessForProfile({
    profileId: profile.id,
    workspaceType: "manager",
  });

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
  const { supabase, profile, organization } = await requireManagerOrganization();

  const property = await createManagerPropertyRecord(supabase, {
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

  try {
    await createManagerPropertyServiceCharges(supabase, {
      organizationId: organization.id,
      landlordClientId: input.landlordClientId,
      propertyId: property.id,
      createdByProfileId: profile.id,
      charges: input.serviceCharges.map((charge, index) => ({
        chargeCode: nullableText(charge.chargeCode),
        chargeName: charge.chargeName,
        description: nullableText(charge.description),
        amount: roundMoney(charge.amount),
        isRequiredBeforeMoveIn: charge.isRequiredBeforeMoveIn,
        sortOrder: index,
        metadata: {
          source: "bopa_manager_property_onboarding",
        },
      })),
    });

    await createManagerPropertyRules(supabase, {
      organizationId: organization.id,
      landlordClientId: input.landlordClientId,
      propertyId: property.id,
      createdByProfileId: profile.id,
      rules: input.propertyRules.map((rule, index) => ({
        title: rule.title,
        description: rule.description,
        category: rule.category,
        enforcement: "information_only",
        appliesTo: rule.appliesTo,
        requiresTenantAcknowledgement:
          rule.requiresTenantAcknowledgement,
        sortOrder: index,
        metadata: {
          source: "bopa_manager_property_onboarding",
        },
      })),
    });
  } catch (error) {
    const adminSupabase = createSupabaseAdminClient();

    try {
      await deleteManagerPropertyRecord(adminSupabase, {
        organizationId: organization.id,
        landlordClientId: input.landlordClientId,
        propertyId: property.id,
      });
    } catch {
      throw new AppError(
        "MANAGER_PROPERTY_CLEANUP_FAILED",
        "We could not finish adding this property. Please contact support before trying again.",
        500,
      );
    }

    throw error;
  }

  return property;
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
    rentFrequency: input.rentFrequency,
    rentAmount: roundMoney(input.rentAmount),
    status: "vacant",
    notes: nullableText(input.notes),
  });
}

export async function createManagerTenant(input: CreateManagerTenantInput) {
  const { supabase, profile, organization } = await requireManagerOrganization();
  const admin = createSupabaseAdminClient();
  const unit = await getManagerUnitById(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
    unitId: input.unitId,
  });

  if (!unit || unit.status !== "vacant") {
    throw new AppError(
      "MANAGER_UNIT_NOT_AVAILABLE",
      "The selected unit is no longer vacant.",
      400,
    );
  }

  const moveInDate = input.moveInDate;
  const paymentFrequency = unit.rent_frequency;
  const rentAmount = roundMoney(Number(unit.rent_amount));
  const currentCycle = calculateCurrentRentCycle({
    anchorDate: moveInDate,
    paymentFrequency,
  });
  const nextRentDueDate = calculateCurrentRentDueDate({
    anchorDate: moveInDate,
    paymentFrequency,
  });
  const tenantId = crypto.randomUUID();
  const clientMutationId = crypto.randomUUID();
  const phone = normalisePhoneNumber(input.phoneNumber);
  const { data, error } = await admin.rpc(
    "create_manager_existing_tenant_offline",
    {
      p_profile_id: profile.id,
      p_organization_id: organization.id,
      p_tenant_id: tenantId,
      p_landlord_client_id: input.landlordClientId,
      p_property_id: input.propertyId,
      p_unit_id: input.unitId,
      p_full_name: input.fullName,
      p_phone_number: phone.e164,
      p_email: nullableText(input.email),
      p_occupation: nullableText(input.occupation),
      p_rent_amount: rentAmount,
      p_current_balance: roundMoney(input.currentBalance),
      p_move_in_date: moveInDate,
      p_next_rent_due_date: nextRentDueDate,
      p_notes: nullableText(input.notes),
      p_client_mutation_id: clientMutationId,
    },
  );

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError(
      "MANAGER_TENANT_CREATE_FAILED",
      "The tenant could not be confirmed after saving.",
      500,
    );
  }

  const tenantData = data as Record<string, unknown>;

  return {
    ...tenantData,
    id: typeof tenantData.id === "string" ? tenantData.id : tenantId,
    payment_frequency: paymentFrequency,
    rent_cycle_anchor_date: moveInDate,
    current_period_start: currentCycle.periodStart,
    current_period_end: currentCycle.periodEnd,
    next_rent_due_date: nextRentDueDate,
  };
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
  const hasOutstandingBalance = Number(tenant.current_balance) > 0;
  const paymentPeriodStart = hasOutstandingBalance
    ? tenant.current_period_start ?? tenant.rent_cycle_anchor_date ?? tenant.move_in_date
    : tenant.next_rent_due_date;
  let paymentPeriodEnd = hasOutstandingBalance ? tenant.current_period_end : null;

  if (
    !hasOutstandingBalance &&
    paymentPeriodStart &&
    tenant.rent_cycle_anchor_date
  ) {
    paymentPeriodEnd = calculateRentPeriodFromStart({
      anchorDate: tenant.rent_cycle_anchor_date,
      paymentFrequency: tenant.payment_frequency,
      periodStart: paymentPeriodStart,
    }).periodEnd;
  }

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
    baseRentAmount: amountPaid,
    serviceChargeAmount: 0,
    serviceChargeItemsSnapshot: [],
    paymentMethod: input.paymentMethod,
    paymentReference: nullableText(input.paymentReference),
    paymentDate: input.paymentDate,
    periodStart: paymentPeriodStart ?? nullableDate(input.periodStart),
    periodEnd: paymentPeriodEnd ?? nullableDate(input.periodEnd),
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
