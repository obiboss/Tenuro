import { AppError } from "@/server/errors/app-error";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";
import {
  archiveUnit,
  createUnit,
  getUnitsForProperty,
  updateUnit,
} from "@/server/repositories/units.repository";
import { getPropertyById } from "@/server/repositories/properties.repository";
import type {
  CreateUnitInput,
  UpdateUnitInput,
} from "@/server/validators/unit.schema";

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

  return createUnit(supabase, input);
}

export async function updateUnitForCurrentLandlord(
  unitId: string,
  input: UpdateUnitInput,
) {
  await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return updateUnit(supabase, unitId, input);
}

export async function archiveUnitForCurrentLandlord(unitId: string) {
  await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return archiveUnit(supabase, unitId);
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
