import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateUnitInput,
  UpdateUnitInput,
} from "@/server/validators/unit.schema";

export type UnitType =
  | "single_room"
  | "self_contain"
  | "room_and_parlour"
  | "mini_flat"
  | "two_bedroom_flat"
  | "three_bedroom_flat"
  | "duplex"
  | "shop"
  | "office_space"
  | "other";

export type UnitStatus =
  | "vacant"
  | "occupied"
  | "under_renovation"
  | "hold"
  | "pending_vacancy"
  | "archived";

export type UnitRow = {
  id: string;
  property_id: string;
  block_id: string | null;
  building_name: string | null;
  unit_identifier: string;
  unit_type: UnitType;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number | null;
  annual_rent: number | null;
  currency_code: string;
  status: UnitStatus;
  created_at: string;
};

const UNIT_SELECT =
  "id, property_id, block_id, building_name, unit_identifier, unit_type, bedrooms, bathrooms, monthly_rent, annual_rent, currency_code, status, created_at";

export async function createUnit(
  supabase: SupabaseClient,
  input: CreateUnitInput,
) {
  const { data, error } = await supabase
    .from("units")
    .insert({
      property_id: input.propertyId,
      building_name: input.buildingName || null,
      unit_identifier: input.unitIdentifier,
      unit_type: input.unitType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      monthly_rent: input.monthlyRent ?? null,
      annual_rent: input.annualRent ?? null,
      currency_code: input.currencyCode,
      status: "vacant",
    })
    .select(UNIT_SELECT)
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
  const updatePayload: Partial<{
    building_name: string | null;
    unit_identifier: string;
    unit_type: UnitType;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number | null;
    annual_rent: number | null;
    currency_code: string;
  }> = {};

  if (input.buildingName !== undefined) {
    updatePayload.building_name = input.buildingName || null;
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
    .select(UNIT_SELECT)
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
    .select(UNIT_SELECT)
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
    .select(UNIT_SELECT)
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
      building_name,
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
    buildingName: unit.building_name as string | null,
    unitIdentifier: unit.unit_identifier as string,
    unitType: unit.unit_type as UnitType,
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
      building_name,
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
      building_name: string | null;
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
