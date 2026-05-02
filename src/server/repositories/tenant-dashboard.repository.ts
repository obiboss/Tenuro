import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantDashboardTenantRow = {
  id: string;
  profile_id: string | null;
  landlord_id: string;
  unit_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  onboarding_status: string;
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    unit_type: string;
    annual_rent: number | null;
    status: string;
    properties: {
      id: string;
      property_name: string;
      address: string | null;
    } | null;
  } | null;
};

export type TenantDashboardTenancyRow = {
  id: string;
  tenant_id: string;
  landlord_id: string;
  unit_id: string;
  tenancy_reference: string;
  rent_amount: number;
  payment_frequency: string;
  currency_code: string;
  start_date: string;
  end_date: string;
  status: string;
  opening_balance: number;
};

export type TenantDashboardAgreementRow = {
  id: string;
  tenant_id: string;
  tenancy_id: string;
  title: string;
  document_status: string;
  tenant_accepted_at: string | null;
  pdf_path: string | null;
};

export type TenantDashboardPaymentRow = {
  id: string;
  amount_paid: number;
  currency_code: string;
  payment_method: "paystack_gateway" | "bank_transfer" | "cash" | "other";
  payment_reference: string | null;
  payment_date: string;
  payment_for_period_start: string | null;
  payment_for_period_end: string | null;
  receipt_number: string | null;
  receipt_status: "pending" | "generated" | "failed" | "voided";
  receipt_path: string | null;
  balance_after: number;
  status: "posted" | "reversed";
};

const TENANT_SELECT = `
  id,
  profile_id,
  landlord_id,
  unit_id,
  full_name,
  phone_number,
  email,
  onboarding_status,
  units (
    id,
    unit_identifier,
    building_name,
    unit_type,
    annual_rent,
    status,
    properties (
      id,
      property_name,
      address
    )
  )
`;

export async function getTenantDashboardTenantByProfile(
  supabase: SupabaseClient,
  params: {
    profileId: string;
    phoneNumber: string | null;
  },
) {
  const { data: byProfile, error: profileError } = await supabase
    .from("tenants")
    .select(TENANT_SELECT)
    .eq("profile_id", params.profileId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TenantDashboardTenantRow>();

  if (profileError) {
    throw profileError;
  }

  if (byProfile) {
    return byProfile;
  }

  if (!params.phoneNumber) {
    return null;
  }

  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SELECT)
    .eq("phone_number", params.phoneNumber)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TenantDashboardTenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenantShellByPhoneCandidates(
  supabase: SupabaseClient,
  phoneCandidates: string[],
) {
  const uniqueCandidates = [...new Set(phoneCandidates.filter(Boolean))];

  if (uniqueCandidates.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("id, profile_id, full_name, phone_number, email")
    .in("phone_number", uniqueCandidates)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      profile_id: string | null;
      full_name: string;
      phone_number: string;
      email: string | null;
    }>();

  if (error) {
    throw error;
  }

  return data;
}

export async function attachTenantProfile(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    profileId: string;
  },
) {
  const { error } = await supabase
    .from("tenants")
    .update({
      profile_id: params.profileId,
    })
    .eq("id", params.tenantId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}

export async function getActiveTenantTenancy(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(
      `
        id,
        tenant_id,
        landlord_id,
        unit_id,
        tenancy_reference,
        rent_amount,
        payment_frequency,
        currency_code,
        start_date,
        end_date,
        status,
        opening_balance
      `,
    )
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<TenantDashboardTenancyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAcceptedTenantAgreement(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    tenancyId: string;
  },
) {
  const { data, error } = await supabase
    .from("tenancy_agreements")
    .select(
      `
        id,
        tenant_id,
        tenancy_id,
        title,
        document_status,
        tenant_accepted_at,
        pdf_path
      `,
    )
    .eq("tenant_id", params.tenantId)
    .eq("tenancy_id", params.tenancyId)
    .eq("document_status", "accepted")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<TenantDashboardAgreementRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenantPayments(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("rent_payments")
    .select(
      `
        id,
        amount_paid,
        currency_code,
        payment_method,
        payment_reference,
        payment_date,
        payment_for_period_start,
        payment_for_period_end,
        receipt_number,
        receipt_status,
        receipt_path,
        balance_after,
        status
      `,
    )
    .eq("tenant_id", tenantId)
    .order("payment_date", { ascending: false })
    .returns<TenantDashboardPaymentRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
