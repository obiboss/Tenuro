import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";
import {
  archiveProperty,
  createProperty,
  getPropertiesForLandlord,
  getPropertyById,
  updateProperty,
} from "@/server/repositories/properties.repository";
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
} from "@/server/validators/property.schema";
import { AppError } from "@/server/errors/app-error";

export async function createPropertyForCurrentLandlord(
  input: CreatePropertyInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return createProperty(supabase, landlord.id, input);
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

  return updateProperty(supabase, propertyId, input);
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

  return archiveProperty(supabase, propertyId);
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
