import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
} from "@/server/validators/property.schema";

export type PropertyRow = {
  id: string;
  landlord_id: string;
  property_name: string;
  address: string;
  state: string;
  lga: string;
  property_type:
    | "residential"
    | "residential_compound"
    | "flat_complex"
    | "mixed_use";
  country_code: string;
  currency_code: string;
  created_at: string;
};

export type PropertyWithUnitStats = PropertyRow & {
  units: {
    id: string;
    status: string;
  }[];
};

const PROPERTY_SELECT =
  "id, landlord_id, property_name, address, state, lga, property_type, country_code, currency_code, created_at";

export async function createProperty(
  supabase: SupabaseClient,
  landlordId: string,
  input: CreatePropertyInput,
) {
  const { data, error } = await supabase
    .from("properties")
    .insert({
      landlord_id: landlordId,
      property_name: input.propertyName,
      address: input.address,
      state: input.state,
      lga: input.lga,
      property_type: input.propertyType,
      country_code: input.countryCode,
      currency_code: input.currencyCode,
    })
    .select(PROPERTY_SELECT)
    .single<PropertyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProperty(
  supabase: SupabaseClient,
  propertyId: string,
  input: UpdatePropertyInput,
) {
  const updatePayload: Record<string, string> = {};

  if (input.propertyName !== undefined) {
    updatePayload.property_name = input.propertyName;
  }

  if (input.address !== undefined) {
    updatePayload.address = input.address;
  }

  if (input.state !== undefined) {
    updatePayload.state = input.state;
  }

  if (input.lga !== undefined) {
    updatePayload.lga = input.lga;
  }

  if (input.propertyType !== undefined) {
    updatePayload.property_type = input.propertyType;
  }

  if (input.countryCode !== undefined) {
    updatePayload.country_code = input.countryCode;
  }

  if (input.currencyCode !== undefined) {
    updatePayload.currency_code = input.currencyCode;
  }

  const { data, error } = await supabase
    .from("properties")
    .update(updatePayload)
    .eq("id", propertyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .select(PROPERTY_SELECT)
    .single<PropertyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveProperty(
  supabase: SupabaseClient,
  propertyId: string,
) {
  const { error } = await supabase
    .from("properties")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", propertyId)
    .is("deleted_at", null)
    .is("archived_at", null);

  if (error) {
    throw error;
  }
}

export async function getPropertiesForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("properties")
    .select(
      `
      id,
      landlord_id,
      property_name,
      address,
      state,
      lga,
      property_type,
      country_code,
      currency_code,
      created_at,
      units (
        id,
        status
      )
    `,
    )
    .eq("landlord_id", landlordId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<PropertyWithUnitStats[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPropertyById(
  supabase: SupabaseClient,
  propertyId: string,
) {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("id", propertyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .single<PropertyRow>();

  if (error) {
    throw error;
  }

  return data;
}
