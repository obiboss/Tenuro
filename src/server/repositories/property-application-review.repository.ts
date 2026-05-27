import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyApplicationStatus } from "@/server/repositories/tenant-applications.repository";

export type ReviewTenantKycProfile = {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  date_of_birth: string | null;
  home_address: string | null;
  occupation: string | null;
  employer: string | null;
  id_type: string | null;
  id_document_path: string | null;
  passport_photo_path: string | null;
  kyc_answers: Record<string, unknown>;
  kyc_review_flags: Record<string, unknown>[];
  status: string;
  completed_at: string | null;
  last_verified_at: string | null;
};

export type ReviewAgentPropertyListing = {
  id: string;
  property_name: string;
  address: string;
  state: string;
  lga: string;
  property_type: string;
  building_name: string | null;
  unit_identifier: string;
  unit_type: string;
  bedrooms: number;
  bathrooms: number;
  annual_rent: number | null;
  monthly_rent: number | null;
  currency_code: string;
  agent_commission_amount: number;
  agent_commission_note: string | null;
  status: string;
};

export type LandlordPropertyApplicationReviewRow = {
  id: string;
  tenant_kyc_profile_id: string;
  agent_property_listing_id: string;
  agent_id: string;
  landlord_id: string | null;
  landlord_phone_number: string | null;
  acquisition_context_key: string;
  processing_fee_access_id: string | null;
  converted_tenant_id: string | null;
  status: PropertyApplicationStatus;
  inspection_status: string;
  landlord_decision_reason: string | null;
  tenant_decision_reason: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  tenant_kyc_profiles: ReviewTenantKycProfile | null;
  agent_property_listings: ReviewAgentPropertyListing | null;
};

const LANDLORD_PROPERTY_APPLICATION_REVIEW_SELECT = `
  id,
  tenant_kyc_profile_id,
  agent_property_listing_id,
  agent_id,
  landlord_id,
  landlord_phone_number,
  acquisition_context_key,
  processing_fee_access_id,
  converted_tenant_id,
  status,
  inspection_status,
  landlord_decision_reason,
  tenant_decision_reason,
  submitted_at,
  decided_at,
  decided_by,
  metadata,
  created_at,
  updated_at,
  tenant_kyc_profiles (
    id,
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
    kyc_answers,
    kyc_review_flags,
    status,
    completed_at,
    last_verified_at
  ),
  agent_property_listings (
    id,
    property_name,
    address,
    state,
    lga,
    property_type,
    building_name,
    unit_identifier,
    unit_type,
    bedrooms,
    bathrooms,
    annual_rent,
    monthly_rent,
    currency_code,
    agent_commission_amount,
    agent_commission_note,
    status
  )
`;

export async function getPropertyApplicationsForLandlordReview(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("property_applications")
    .select(LANDLORD_PROPERTY_APPLICATION_REVIEW_SELECT)
    .eq("landlord_id", landlordId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<LandlordPropertyApplicationReviewRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
