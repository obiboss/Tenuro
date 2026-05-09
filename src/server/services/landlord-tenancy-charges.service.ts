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
import { requireLandlord } from "./auth.service";

function getPropertyIdFromTenancyContext(
  tenancy: Awaited<ReturnType<typeof getTenancyPaymentContext>>,
) {
  return tenancy.units?.properties?.id ?? null;
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

export async function getLandlordChargesForCurrentLandlord(tenancyId: string) {
  const landlord = await requireLandlord();
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
  const landlord = await requireLandlord();
  const supabase = createSupabaseAdminClient();

  const tenancy = await getAuthorizedTenancyForLandlord({
    tenancyId: input.tenancyId,
    landlordId: landlord.id,
  });

  const charge = await createLandlordTenancyCharge(supabase, {
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    unitId: tenancy.unit_id,
    propertyId: getPropertyIdFromTenancyContext(tenancy),
    chargeType: input.chargeType,
    label: input.label,
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
    description: `Landlord charge added: ${charge.label}.`,
    metadata: {
      audit_subtype: "landlord_tenancy_charge_created",
      charge_id: charge.id,
      charge_type: charge.charge_type,
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
  const landlord = await requireLandlord();
  const supabase = createSupabaseAdminClient();

  const tenancy = await getAuthorizedTenancyForLandlord({
    tenancyId: input.tenancyId,
    landlordId: landlord.id,
  });

  const charge = await updateLandlordTenancyCharge(supabase, {
    chargeId: input.chargeId,
    landlordId: landlord.id,
    chargeType: input.chargeType,
    label: input.label,
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
    description: `Landlord charge updated: ${charge.label}.`,
    metadata: {
      audit_subtype: "landlord_tenancy_charge_updated",
      charge_id: charge.id,
      charge_type: charge.charge_type,
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
  const landlord = await requireLandlord();
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
    description: `Landlord charge archived: ${charge.label}.`,
    metadata: {
      audit_subtype: "landlord_tenancy_charge_archived",
      charge_id: charge.id,
      charge_type: charge.charge_type,
      amount: charge.amount,
      currency_code: charge.currency_code,
    },
  });

  return charge;
}
