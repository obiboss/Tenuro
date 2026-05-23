import "server-only";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  archiveLandlordTenancyCharge,
  createLandlordTenancyCharge,
  getLandlordTenancyChargesForTenancy,
  hasActiveChargeWithName,
  updateLandlordTenancyCharge,
} from "@/server/repositories/landlord-tenancy-charges.repository";
import { getTenancyPaymentContext } from "@/server/repositories/payment-context.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type {
  ArchiveLandlordTenancyChargeInput,
  CreateLandlordTenancyChargeInput,
  UpdateLandlordTenancyChargeInput,
} from "@/server/validators/landlord-tenancy-charges.schema";
import { requireLandlordPlatformOperator } from "./auth.service";

function getPropertyIdFromTenancyContext(
  tenancy: Awaited<ReturnType<typeof getTenancyPaymentContext>>,
) {
  return (
    tenancy.units?.properties?.id ??
    tenancy.units?.property_id ??
    null
  );
}

async function getAuthorizedTenancyForLandlord(params: {
  tenancyId: string;
  landlordId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const tenancy = await getTenancyPaymentContext(supabase, params.tenancyId);

  if (tenancy.landlord_id !== params.landlordId) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to manage charges for this tenancy.",
      403,
    );
  }

  if (!tenancy.tenants) {
    throw new AppError(
      "TENANT_NOT_FOUND",
      "We could not find the tenant for this tenancy.",
      404,
    );
  }

  return tenancy;
}

const DUPLICATE_CHARGE_NAME_MESSAGE =
  "An active charge with this name already exists. Use a different name or remove the existing charge first.";

async function assertUniqueActiveChargeName(params: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  tenancyId: string;
  landlordId: string;
  chargeName: string;
  excludeChargeId?: string;
}) {
  const hasDuplicate = await hasActiveChargeWithName(params.supabase, {
    tenancyId: params.tenancyId,
    landlordId: params.landlordId,
    chargeName: params.chargeName,
    excludeChargeId: params.excludeChargeId,
  });

  if (hasDuplicate) {
    throw new AppError(
      "DUPLICATE_CHARGE_NAME",
      DUPLICATE_CHARGE_NAME_MESSAGE,
      400,
    );
  }
}

export async function getLandlordChargesForCurrentLandlord(tenancyId: string) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = createSupabaseAdminClient();

  await getAuthorizedTenancyForLandlord({
    tenancyId,
    landlordId: landlord.id,
  });

  return getLandlordTenancyChargesForTenancy(supabase, {
    tenancyId,
    landlordId: landlord.id,
  });
}

export async function createLandlordChargeForCurrentLandlord(
  input: CreateLandlordTenancyChargeInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = createSupabaseAdminClient();

  const tenancy = await getAuthorizedTenancyForLandlord({
    tenancyId: input.tenancyId,
    landlordId: landlord.id,
  });

  await assertUniqueActiveChargeName({
    supabase,
    tenancyId: input.tenancyId,
    landlordId: landlord.id,
    chargeName: input.chargeName,
  });

  const charge = await createLandlordTenancyCharge(supabase, {
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    unitId: tenancy.unit_id,
    propertyId: getPropertyIdFromTenancyContext(tenancy),
    chargeName: input.chargeName,
    description: input.description,
    amount: input.amount,
    currencyCode: input.currencyCode,
    isRefundable: input.isRefundable,
    isRequiredBeforeMoveIn: input.isRequiredBeforeMoveIn,
    metadata: {
      created_from: "landlord_charge_action",
    },
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    unitId: tenancy.unit_id,
    propertyId: getPropertyIdFromTenancyContext(tenancy),
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.paymentLinkSent,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: charge.id,
    description: `Landlord charge added: ${charge.charge_name}.`,
    metadata: {
      audit_subtype: "landlord_tenancy_charge_created",
      charge_id: charge.id,
      charge_name: charge.charge_name,
      amount: charge.amount,
      currency_code: charge.currency_code,
      is_refundable: charge.is_refundable,
      is_required_before_move_in: charge.is_required_before_move_in,
    },
  });

  return charge;
}

export async function updateLandlordChargeForCurrentLandlord(
  input: UpdateLandlordTenancyChargeInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = createSupabaseAdminClient();

  const tenancy = await getAuthorizedTenancyForLandlord({
    tenancyId: input.tenancyId,
    landlordId: landlord.id,
  });

  await assertUniqueActiveChargeName({
    supabase,
    tenancyId: input.tenancyId,
    landlordId: landlord.id,
    chargeName: input.chargeName,
    excludeChargeId: input.chargeId,
  });

  const charge = await updateLandlordTenancyCharge(supabase, {
    chargeId: input.chargeId,
    landlordId: landlord.id,
    chargeName: input.chargeName,
    description: input.description,
    amount: input.amount,
    currencyCode: input.currencyCode,
    isRefundable: input.isRefundable,
    isRequiredBeforeMoveIn: input.isRequiredBeforeMoveIn,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    unitId: tenancy.unit_id,
    propertyId: getPropertyIdFromTenancyContext(tenancy),
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.paymentLinkSent,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: charge.id,
    description: `Landlord charge updated: ${charge.charge_name}.`,
    metadata: {
      audit_subtype: "landlord_tenancy_charge_updated",
      charge_id: charge.id,
      charge_name: charge.charge_name,
      amount: charge.amount,
      currency_code: charge.currency_code,
      is_refundable: charge.is_refundable,
      is_required_before_move_in: charge.is_required_before_move_in,
    },
  });

  return charge;
}

export async function archiveLandlordChargeForCurrentLandlord(
  input: ArchiveLandlordTenancyChargeInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = createSupabaseAdminClient();

  const tenancy = await getAuthorizedTenancyForLandlord({
    tenancyId: input.tenancyId,
    landlordId: landlord.id,
  });

  const charge = await archiveLandlordTenancyCharge(supabase, {
    chargeId: input.chargeId,
    landlordId: landlord.id,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    unitId: tenancy.unit_id,
    propertyId: getPropertyIdFromTenancyContext(tenancy),
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.paymentLinkExpired,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: charge.id,
    description: `Landlord charge archived: ${charge.charge_name}.`,
    metadata: {
      audit_subtype: "landlord_tenancy_charge_archived",
      charge_id: charge.id,
      charge_name: charge.charge_name,
      amount: charge.amount,
      currency_code: charge.currency_code,
    },
  });

  return charge;
}
