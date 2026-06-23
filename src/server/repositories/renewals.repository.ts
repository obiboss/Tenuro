import type { SupabaseClient } from "@supabase/supabase-js";

export type LandlordRentAlertTenancyRow = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  unit_id: string;
  rent_amount: number;
  payment_frequency: "monthly" | "quarterly" | "biannual" | "annual";
  currency_code: string;
  start_date: string | null;
  end_date: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_rent_charge_date: string | null;
  tenancy_status: string;
  agreement_live_at: string | null;
  tenants: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
  } | null;
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    properties: {
      id: string;
      property_name: string;
      address: string | null;
    } | null;
  } | null;
};

const RENT_ALERT_TENANCY_SELECT = `
  id,
  landlord_id,
  tenant_id,
  unit_id,
  rent_amount,
  payment_frequency,
  currency_code,
  start_date,
  end_date,
  current_period_start,
  current_period_end,
  next_rent_charge_date,
  tenancy_status,
  agreement_live_at,
  tenants (
    id,
    full_name,
    phone_number,
    email
  ),
  units (
    id,
    unit_identifier,
    building_name,
    properties (
      id,
      property_name,
      address
    )
  )
`;

export async function getActiveRentAlertTenanciesForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(RENT_ALERT_TENANCY_SELECT)
    .eq("landlord_id", landlordId)
    .eq("tenancy_status", "active")
    .not("agreement_live_at", "is", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("next_rent_charge_date", { ascending: true })
    .returns<LandlordRentAlertTenancyRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

/** RLS on tenancies scopes results to caretaker-assigned properties. */
export async function getActiveRentAlertTenanciesForCaretaker(
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(RENT_ALERT_TENANCY_SELECT)
    .eq("tenancy_status", "active")
    .not("agreement_live_at", "is", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("next_rent_charge_date", { ascending: true })
    .returns<LandlordRentAlertTenancyRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
