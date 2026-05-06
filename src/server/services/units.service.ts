import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getPropertyById } from "@/server/repositories/properties.repository";
import {
  archiveUnit,
  createUnit,
  getUnitById,
  getUnitsForProperty,
  updateUnit,
} from "@/server/repositories/units.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type {
  CreateUnitInput,
  UpdateUnitInput,
} from "@/server/validators/unit.schema";
import { requireLandlord } from "./auth.service";

export async function createUnitForCurrentLandlord(input: CreateUnitInput) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const property = await getPropertyById(supabase, input.propertyId);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to add a unit here.",
      403,
    );
  }

  const unit = await createUnit(supabase, input);

  await writeAuditLog({
    landlordId: landlord.id,
    unitId: unit.id,
    propertyId: property.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.unitCreated,
    entityType: AUDIT_ENTITY_TYPES.unit,
    entityId: unit.id,
    description: `${unit.unit_identifier} unit was created.`,
    metadata: {
      unit_identifier: unit.unit_identifier,
      unit_type: unit.unit_type,
      building_name: unit.building_name,
      property_name: property.property_name,
      status: unit.status,
    },
  });

  return unit;
}

export async function updateUnitForCurrentLandlord(
  unitId: string,
  input: UpdateUnitInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const unit = await getUnitById(supabase, unitId);
  const property = await getPropertyById(supabase, unit.property_id);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to edit this unit.",
      403,
    );
  }

  const updatedUnit = await updateUnit(supabase, unitId, input);
  const statusChanged = unit.status !== updatedUnit.status;

  await writeAuditLog({
    landlordId: landlord.id,
    unitId,
    propertyId: property.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: statusChanged
      ? AUDIT_EVENT_TYPES.unitStatusChanged
      : AUDIT_EVENT_TYPES.unitUpdated,
    entityType: AUDIT_ENTITY_TYPES.unit,
    entityId: unitId,
    description: statusChanged
      ? `${unit.unit_identifier} status changed from ${unit.status} to ${updatedUnit.status}.`
      : `${unit.unit_identifier} unit details were updated.`,
    metadata: {
      unit_identifier: unit.unit_identifier,
      property_name: property.property_name,
      updated_fields: Object.keys(input),
      previous_status: unit.status,
      current_status: updatedUnit.status,
    },
  });

  return updatedUnit;
}

export async function archiveUnitForCurrentLandlord(unitId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const unit = await getUnitById(supabase, unitId);
  const property = await getPropertyById(supabase, unit.property_id);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to archive this unit.",
      403,
    );
  }

  const archivedUnit = await archiveUnit(supabase, unitId);

  await writeAuditLog({
    landlordId: landlord.id,
    unitId,
    propertyId: property.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.unitArchived,
    entityType: AUDIT_ENTITY_TYPES.unit,
    entityId: unitId,
    description: `${unit.unit_identifier} unit was archived.`,
    metadata: {
      unit_identifier: unit.unit_identifier,
      property_name: property.property_name,
      previous_status: unit.status,
      archived_at: new Date().toISOString(),
    },
  });

  return archivedUnit;
}

export async function getPropertyUnitsForCurrentLandlord(propertyId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const property = await getPropertyById(supabase, propertyId);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view these units.",
      403,
    );
  }

  return getUnitsForProperty(supabase, propertyId);
}
