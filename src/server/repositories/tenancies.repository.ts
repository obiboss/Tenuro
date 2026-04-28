import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateTenancyInput } from "@/server/validators/tenancy.schema";

export type TenancyRow = {
  id: string;
  tenancy_reference: string | null;
  landlord_id: string;
  tenant_id: string;
  unit_id: string;
  rent_amount: number;
  payment_frequency: "monthly" | "quarterly" | "biannual" | "annual";
  currency_code: string;
  start_date: string | null;
  end_date: string | null;
  renewal_notice_date: string | null;
  opening_balance: number;
  opening_balance_note: string | null;
  status: "draft" | "active" | "expired" | "terminated" | "archived" | null;
  agreement_notes: string | null;
  created_at: string;
};

export type TenancyDetailRow = TenancyRow & {
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
    unit_type: string;
    properties: {
      id: string;
      property_name: string;
      address: string;
    } | null;
  } | null;
};

const TENANCY_SELECT = `
  id,
  tenancy_reference,
  landlord_id,
  tenant_id,
  unit_id,
  rent_amount,
  payment_frequency,
  currency_code,
  start_date,
  end_date,
  renewal_notice_date,
  opening_balance,
  opening_balance_note,
  status,
  agreement_notes,
  created_at
`;

const TENANCY_DETAIL_SELECT = `
  id,
  tenancy_reference,
  landlord_id,
  tenant_id,
  unit_id,
  rent_amount,
  payment_frequency,
  currency_code,
  start_date,
  end_date,
  renewal_notice_date,
  opening_balance,
  opening_balance_note,
  status,
  agreement_notes,
  created_at,
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
    unit_type,
    properties (
      id,
      property_name,
      address
    )
  )
`;

function createTenancyReference() {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `TEN-${datePart}-${randomPart}`;
}

function getRentDueDay(startDate: string) {
  const day = new Date(startDate).getUTCDate();

  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return 1;
  }

  return day;
}

export async function getActiveTenancyForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_DETAIL_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle<TenancyDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActiveTenancyForUnit(
  supabase: SupabaseClient,
  unitId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_SELECT)
    .eq("unit_id", unitId)
    .eq("status", "active")
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle<TenancyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTenancy(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    input: CreateTenancyInput;
  },
) {
  const rentDueDay = getRentDueDay(params.input.startDate);

  const { data, error } = await supabase
    .from("tenancies")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.input.tenantId,
      unit_id: params.input.unitId,
      tenancy_reference: createTenancyReference(),

      rent_amount: params.input.rentAmount,
      payment_frequency: params.input.paymentFrequency,
      currency_code: params.input.currencyCode,

      start_date: params.input.startDate,
      end_date: params.input.endDate,
      renewal_notice_date: params.input.renewalNoticeDate || null,

      /*
       * Legacy/current DB-required columns.
       * Keep these mapped until the database is fully consolidated.
       */
      move_in_date: params.input.startDate,
      move_out_date: params.input.endDate,
      next_renewal_date: params.input.endDate,
      rent_due_day: rentDueDay,
      tenancy_status: "active",

      opening_balance: params.input.openingBalance,
      opening_balance_note: params.input.openingBalanceNote || null,
      agreement_notes: params.input.agreementNotes || null,
      status: "active",
    })
    .select(TENANCY_DETAIL_SELECT)
    .single<TenancyDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function terminateTenancy(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    reason: string;
  },
) {
  const { data, error } = await supabase
    .from("tenancies")
    .update({
      status: "terminated",
      tenancy_status: "terminated",
      agreement_notes: params.reason,
      archived_at: new Date().toISOString(),
    })
    .eq("id", params.tenancyId)
    .eq("status", "active")
    .select(TENANCY_SELECT)
    .single<TenancyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenanciesForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_DETAIL_SELECT)
    .eq("landlord_id", landlordId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<TenancyDetailRow[]>();

  if (error) {
    throw error;
  }

  return data;
}