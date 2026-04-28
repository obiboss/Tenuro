import type { SupabaseClient } from "@supabase/supabase-js";

export type TenancyPaymentContext = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  unit_id: string;
  rent_amount: number;
  currency_code: string;
  status: string;
  tenants: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
  } | null;
  units: {
    id: string;
    unit_identifier: string;
    properties: {
      id: string;
      property_name: string;
    } | null;
  } | null;
};

export async function getTenancyPaymentContext(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(
      `
      id,
      landlord_id,
      tenant_id,
      unit_id,
      rent_amount,
      currency_code,
      status,
      tenants (
        id,
        full_name,
        phone_number,
        email
      ),
      units (
        id,
        unit_identifier,
        properties (
          id,
          property_name
        )
      )
    `,
    )
    .eq("id", tenancyId)
    .single<TenancyPaymentContext>();

  if (error) {
    throw error;
  }

  return data;
}
