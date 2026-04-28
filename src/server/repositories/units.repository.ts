import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateUnitInput,
  UpdateUnitInput,
} from "@/server/validators/unit.schema";

export type UnitRow = {
  id: string;
  property_id: string;
  block_id: string | null;
  unit_identifier: string;
  unit_type: "room" | "flat" | "duplex" | "shop" | "other";
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number | null;
  annual_rent: number | null;
  currency_code: string;
  status:
    | "vacant"
    | "occupied"
    | "under_renovation"
    | "hold"
    | "pending_vacancy"
    | "archived";
  created_at: string;
};

export async function createUnit(
  supabase: SupabaseClient,
  input: CreateUnitInput,
) {
  const { data, error } = await supabase
    .from("units")
    .insert({
      property_id: input.propertyId,
      block_id: input.blockId ?? null,
      unit_identifier: input.unitIdentifier,
      unit_type: input.unitType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      monthly_rent: input.monthlyRent ?? null,
      annual_rent: input.annualRent ?? null,
      currency_code: input.currencyCode,
      status: "vacant",
    })
    .select(
      "id, property_id, block_id, unit_identifier, unit_type, bedrooms, bathrooms, monthly_rent, annual_rent, currency_code, status, created_at",
    )
    .single<UnitRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateUnit(
  supabase: SupabaseClient,
  unitId: string,
  input: UpdateUnitInput,
) {
  const updatePayload: Record<string, string | number | null> = {};

  if (input.blockId !== undefined) {
    updatePayload.block_id = input.blockId;
  }

  if (input.unitIdentifier !== undefined) {
    updatePayload.unit_identifier = input.unitIdentifier;
  }

  if (input.unitType !== undefined) {
    updatePayload.unit_type = input.unitType;
  }

  if (input.bedrooms !== undefined) {
    updatePayload.bedrooms = input.bedrooms;
  }

  if (input.bathrooms !== undefined) {
    updatePayload.bathrooms = input.bathrooms;
  }

  if (input.monthlyRent !== undefined) {
    updatePayload.monthly_rent = input.monthlyRent;
  }

  if (input.annualRent !== undefined) {
    updatePayload.annual_rent = input.annualRent;
  }

  if (input.currencyCode !== undefined) {
    updatePayload.currency_code = input.currencyCode;
  }

  const { data, error } = await supabase
    .from("units")
    .update(updatePayload)
    .eq("id", unitId)
    .is("deleted_at", null)
    .select(
      "id, property_id, block_id, unit_identifier, unit_type, bedrooms, bathrooms, monthly_rent, annual_rent, currency_code, status, created_at",
    )
    .single<UnitRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUnitsForProperty(
  supabase: SupabaseClient,
  propertyId: string,
) {
  const { data, error } = await supabase
    .from("units")
    .select(
      "id, property_id, block_id, unit_identifier, unit_type, bedrooms, bathrooms, monthly_rent, annual_rent, currency_code, status, created_at",
    )
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<UnitRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveUnit(supabase: SupabaseClient, unitId: string) {
  const { error } = await supabase
    .from("units")
    .update({
      archived_at: new Date().toISOString(),
      status: "archived",
    })
    .eq("id", unitId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}

export async function getUnitById(supabase: SupabaseClient, unitId: string) {
  const { data, error } = await supabase
    .from("units")
    .select(
      "id, property_id, block_id, unit_identifier, unit_type, bedrooms, bathrooms, monthly_rent, annual_rent, currency_code, status, created_at",
    )
    .eq("id", unitId)
    .is("deleted_at", null)
    .single<UnitRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getVacantUnitsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("units")
    .select(
      `
      id,
      property_id,
      block_id,
      unit_identifier,
      unit_type,
      bedrooms,
      bathrooms,
      monthly_rent,
      annual_rent,
      currency_code,
      status,
      created_at,
      properties!inner (
        id,
        landlord_id,
        property_name
      )
    `,
    )
    .eq("properties.landlord_id", landlordId)
    .eq("status", "vacant")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((unit) => ({
    id: unit.id as string,
    propertyId: unit.property_id as string,
    unitIdentifier: unit.unit_identifier as string,
    unitType: unit.unit_type as string,
    annualRent: unit.annual_rent as number | null,
    monthlyRent: unit.monthly_rent as number | null,
    currencyCode: unit.currency_code as string,
    propertyName: Array.isArray(unit.properties)
      ? unit.properties[0]?.property_name
      : unit.properties.property_name,
  }));
}

export async function markUnitOccupied(
  supabase: SupabaseClient,
  unitId: string,
) {
  const { error } = await supabase
    .from("units")
    .update({
      status: "occupied",
    })
    .eq("id", unitId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}

export async function getUnitWithPropertyById(
  supabase: SupabaseClient,
  unitId: string,
) {
  const { data, error } = await supabase
    .from("units")
    .select(
      `
      id,
      unit_identifier,
      property_id,
      properties (
        id,
        property_name,
        landlord_id
      )
    `,
    )
    .eq("id", unitId)
    .is("deleted_at", null)
    .single<{
      id: string;
      unit_identifier: string;
      property_id: string;
      properties: {
        id: string;
        property_name: string;
        landlord_id: string;
      } | null;
    }>();

  if (error) {
    throw error;
  }

  return data;
}
