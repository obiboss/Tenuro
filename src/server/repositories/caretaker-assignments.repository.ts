import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaretakerAssignmentPermissions } from "@/server/constants/caretaker-permissions";

export type { CaretakerAssignmentPermissions };

type CaretakerAssignmentDbRow = {
  id: string;
  landlord_id: string;
  caretaker_profile_id: string;
  property_id: string;
  permissions: CaretakerAssignmentPermissions;
  created_at: string;
  revoked_at: string | null;
  properties: {
    id: string;
    property_name: string;
  } | null;
  landlord: {
    id: string;
    full_name: string;
    phone_number: string | null;
  } | null;
};

export type CaretakerAssignmentRow = {
  id: string;
  landlord_id: string;
  caretaker_profile_id: string;
  property_id: string;
  permissions: CaretakerAssignmentPermissions;
  created_at: string;
  revoked_at: string | null;
  is_active: boolean;
  assigned_at: string;
  properties: {
    id: string;
    property_name: string;
  } | null;
  landlord: {
    id: string;
    full_name: string;
    phone_number: string | null;
  } | null;
};

const CARETAKER_ASSIGNMENT_SELECT = `
  id,
  landlord_id,
  caretaker_profile_id,
  property_id,
  permissions,
  created_at,
  revoked_at,
  properties (
    id,
    property_name
  ),
  landlord:profiles!caretaker_assignments_landlord_id_fkey (
    id,
    full_name,
    phone_number
  )
`;

export type LandlordCaretakerAssignmentRow = {
  id: string;
  landlord_id: string;
  caretaker_profile_id: string;
  property_id: string;
  permissions: CaretakerAssignmentPermissions;
  created_at: string;
  revoked_at: string | null;
  properties: {
    id: string;
    property_name: string;
  } | null;
  caretaker: {
    id: string;
    full_name: string;
    phone_number: string | null;
    role: string;
  } | null;
};

const LANDLORD_CARETAKER_ASSIGNMENT_SELECT = `
  id,
  landlord_id,
  caretaker_profile_id,
  property_id,
  permissions,
  created_at,
  revoked_at,
  properties (
    id,
    property_name
  ),
  caretaker:profiles!caretaker_assignments_caretaker_profile_id_fkey (
    id,
    full_name,
    phone_number,
    role
  )
`;

export async function listCaretakerAssignmentsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("caretaker_assignments")
    .select(LANDLORD_CARETAKER_ASSIGNMENT_SELECT)
    .eq("landlord_id", landlordId)
    .order("created_at", { ascending: false })
    .returns<LandlordCaretakerAssignmentRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function upsertCaretakerAssignment(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    caretakerProfileId: string;
    propertyId: string;
    permissions: CaretakerAssignmentPermissions;
  },
) {
  const { data, error } = await supabase
    .from("caretaker_assignments")
    .upsert(
      {
        landlord_id: params.landlordId,
        caretaker_profile_id: params.caretakerProfileId,
        property_id: params.propertyId,
        permissions: params.permissions,
        revoked_at: null,
      },
      {
        onConflict: "caretaker_profile_id,property_id",
      },
    )
    .select(LANDLORD_CARETAKER_ASSIGNMENT_SELECT)
    .single<LandlordCaretakerAssignmentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function revokeCaretakerAssignments(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    caretakerProfileId: string;
    propertyId?: string;
  },
) {
  let query = supabase
    .from("caretaker_assignments")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("landlord_id", params.landlordId)
    .eq("caretaker_profile_id", params.caretakerProfileId)
    .is("revoked_at", null);

  if (params.propertyId) {
    query = query.eq("property_id", params.propertyId);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}

export async function getActiveCaretakerAssignments(
  supabase: SupabaseClient,
  caretakerProfileId: string,
): Promise<CaretakerAssignmentRow[]> {
  const { data, error } = await supabase
    .from("caretaker_assignments")
    .select(CARETAKER_ASSIGNMENT_SELECT)
    .eq("caretaker_profile_id", caretakerProfileId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true })
    .returns<CaretakerAssignmentDbRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((assignment) => ({
    ...assignment,
    is_active: assignment.revoked_at === null,
    assigned_at: assignment.created_at,
  }));
}
