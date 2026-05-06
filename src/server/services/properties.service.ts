import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  archiveProperty,
  createProperty,
  getPropertiesForLandlord,
  getPropertyById,
  updateProperty,
} from "@/server/repositories/properties.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
} from "@/server/validators/property.schema";
import { requireLandlord } from "./auth.service";

export async function createPropertyForCurrentLandlord(
  input: CreatePropertyInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const property = await createProperty(supabase, landlord.id, input);

  await writeAuditLog({
    landlordId: landlord.id,
    propertyId: property.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.propertyCreated,
    entityType: AUDIT_ENTITY_TYPES.property,
    entityId: property.id,
    description: `${property.property_name} property was created.`,
    metadata: {
      property_name: property.property_name,
      property_type: property.property_type,
      state: property.state,
      lga: property.lga,
    },
  });

  return property;
}

export async function updatePropertyForCurrentLandlord(
  propertyId: string,
  input: UpdatePropertyInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const property = await getPropertyById(supabase, propertyId);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to edit this property.",
      403,
    );
  }

  const updatedProperty = await updateProperty(supabase, propertyId, input);

  await writeAuditLog({
    landlordId: landlord.id,
    propertyId,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.propertyUpdated,
    entityType: AUDIT_ENTITY_TYPES.property,
    entityId: propertyId,
    description: `${property.property_name} property details were updated.`,
    metadata: {
      property_name: property.property_name,
      updated_fields: Object.keys(input),
      current_property_name: updatedProperty.property_name,
    },
  });

  return updatedProperty;
}

export async function archivePropertyForCurrentLandlord(propertyId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const property = await getPropertyById(supabase, propertyId);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to archive this property.",
      403,
    );
  }

  const archivedProperty = await archiveProperty(supabase, propertyId);

  await writeAuditLog({
    landlordId: landlord.id,
    propertyId,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.propertyArchived,
    entityType: AUDIT_ENTITY_TYPES.property,
    entityId: propertyId,
    description: `${property.property_name} property was archived.`,
    metadata: {
      property_name: property.property_name,
      archived_at: new Date().toISOString(),
    },
  });

  return archivedProperty;
}

export async function getCurrentLandlordProperties() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return getPropertiesForLandlord(supabase, landlord.id);
}

export async function getCurrentLandlordProperty(propertyId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const property = await getPropertyById(supabase, propertyId);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this property.",
      403,
    );
  }

  return property;
}
