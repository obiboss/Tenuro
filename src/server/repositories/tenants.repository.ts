import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateTenantShellInput,
  UpdateTenantInput,
} from "@/server/validators/tenant.schema";

export type TenantOnboardingStatus =
  | "invited"
  | "profile_complete"
  | "approved"
  | "rejected"
  | "token_expired";

export type TenantRow = {
  id: string;
  profile_id: string | null;
  landlord_id: string;
  unit_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  date_of_birth: string | null;
  home_address: string | null;
  occupation: string | null;
  employer: string | null;
  id_type: "nin" | "passport" | "drivers_license" | "voters_card" | null;
  id_document_path: string | null;
  passport_photo_path: string | null;
  onboarding_status: TenantOnboardingStatus;
  landlord_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
};

export type TenantListRow = TenantRow & {
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    unit_type: string;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number | null;
    annual_rent: number | null;
    status: string;
    properties: {
      id: string;
      property_name: string;
    } | null;
  } | null;
};

const TENANT_SELECT = `
  id,
  profile_id,
  landlord_id,
  unit_id,
  full_name,
  phone_number,
  email,
  date_of_birth,
  home_address,
  occupation,
  employer,
  id_type,
  id_document_path,
  passport_photo_path,
  onboarding_status,
  landlord_notes,
  rejected_reason,
  approved_at,
  approved_by,
  created_at,
  units (
    id,
    unit_identifier,
    building_name,
    unit_type,
    bedrooms,
    bathrooms,
    monthly_rent,
    annual_rent,
    status,
    properties (
      id,
      property_name
    )
  )
`;

const TENANT_BASE_SELECT = `
  id,
  profile_id,
  landlord_id,
  unit_id,
  full_name,
  phone_number,
  email,
  date_of_birth,
  home_address,
  occupation,
  employer,
  id_type,
  id_document_path,
  passport_photo_path,
  onboarding_status,
  landlord_notes,
  rejected_reason,
  approved_at,
  approved_by,
  created_at
`;

export async function createTenantShell(
  supabase: SupabaseClient,
  landlordId: string,
  input: CreateTenantShellInput,
) {
  const { data, error } = await supabase
    .from("tenants")
    .insert({
      landlord_id: landlordId,
      unit_id: input.unitId,
      full_name: input.fullName,
      phone_number: input.phoneNumber,
      email: input.email || null,
      landlord_notes: input.landlordNotes || null,
      onboarding_status: "invited",
    })
    .select(TENANT_BASE_SELECT)
    .single<TenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTenant(
  supabase: SupabaseClient,
  tenantId: string,
  input: UpdateTenantInput,
) {
  const updatePayload: Record<string, string | null> = {};

  if (input.fullName !== undefined) {
    updatePayload.full_name = input.fullName;
  }

  if (input.phoneNumber !== undefined) {
    updatePayload.phone_number = input.phoneNumber;
  }

  if (input.email !== undefined) {
    updatePayload.email = input.email || null;
  }

  if (input.homeAddress !== undefined) {
    updatePayload.home_address = input.homeAddress || null;
  }

  if (input.occupation !== undefined) {
    updatePayload.occupation = input.occupation || null;
  }

  if (input.employer !== undefined) {
    updatePayload.employer = input.employer || null;
  }

  if (input.landlordNotes !== undefined) {
    updatePayload.landlord_notes = input.landlordNotes || null;
  }

  const { data, error } = await supabase
    .from("tenants")
    .update(updatePayload)
    .eq("id", tenantId)
    .is("deleted_at", null)
    .select(TENANT_BASE_SELECT)
    .single<TenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenantsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SELECT)
    .eq("landlord_id", landlordId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<TenantListRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenantById(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SELECT)
    .eq("id", tenantId)
    .is("deleted_at", null)
    .single<TenantListRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function approveTenant(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    approvedBy: string;
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      onboarding_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: params.approvedBy,
      rejected_reason: null,
    })
    .eq("id", params.tenantId)
    .eq("onboarding_status", "profile_complete")
    .is("deleted_at", null)
    .select(TENANT_BASE_SELECT)
    .single<TenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function rejectTenant(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    reason: string;
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      onboarding_status: "rejected",
      rejected_reason: params.reason,
      approved_at: null,
      approved_by: null,
    })
    .eq("id", params.tenantId)
    .in("onboarding_status", ["invited", "profile_complete"])
    .is("deleted_at", null)
    .select(TENANT_BASE_SELECT)
    .single<TenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { error } = await supabase
    .from("tenants")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", tenantId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}
