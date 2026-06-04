import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateNextRentChargeDate,
  calculateTenancyEndDate,
  getRentAnchorDay,
  getRentAnchorMonth,
  type TenancyPaymentFrequency,
} from "@/lib/tenancy-period";
import type { CreateTenancyInput } from "@/server/validators/tenancy.schema";

export type TenancyLifecycleStatus =
  | "active"
  | "expired"
  | "terminated"
  | "pending_renewal"
  | "notice_given"
  | "hold"
  | "special_case"
  | "archived";

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
  move_out_date: string | null;
  renewal_notice_date: string | null;
  reminder_interval_days: number | null;
  charges_confirmed_at: string | null;
  agreement_live_at: string | null;
  rent_due_day: number;
  rent_anchor_month: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_rent_charge_date: string | null;
  opening_balance: number;
  opening_balance_note: string | null;
  status: string | null;
  tenancy_status: TenancyLifecycleStatus;
  agreement_notes: string | null;
  archived_at: string | null;
  created_at: string;
};

export type TenancyDetailRow = TenancyRow & {
  tenants: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
    home_address: string | null;
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
  move_out_date,
  renewal_notice_date,
  reminder_interval_days,
  charges_confirmed_at,
  agreement_live_at,
  rent_due_day,
  rent_anchor_month,
  current_period_start,
  current_period_end,
  next_rent_charge_date,
  opening_balance,
  opening_balance_note,
  status,
  tenancy_status,
  agreement_notes,
  archived_at,
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
  move_out_date,
  renewal_notice_date,
  reminder_interval_days,
  charges_confirmed_at,
  agreement_live_at,
  rent_due_day,
  rent_anchor_month,
  current_period_start,
  current_period_end,
  next_rent_charge_date,
  opening_balance,
  opening_balance_note,
  status,
  tenancy_status,
  agreement_notes,
  archived_at,
  created_at,
  tenants (
    id,
    full_name,
    phone_number,
    email,
    home_address
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
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `TEN-${datePart}-${randomPart}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function isTenancyInAgreementSetup(
  tenancy: Pick<TenancyRow, "agreement_live_at" | "tenancy_status">,
) {
  return (
    tenancy.agreement_live_at === null && tenancy.tenancy_status === "active"
  );
}

export function isTenancyOperationallyLive(
  tenancy: Pick<TenancyRow, "agreement_live_at" | "tenancy_status">,
) {
  return (
    tenancy.agreement_live_at !== null && tenancy.tenancy_status === "active"
  );
}

export async function getSetupTenancyForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_DETAIL_SELECT)
    .eq("tenant_id", tenantId)
    .eq("tenancy_status", "active")
    .is("agreement_live_at", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TenancyDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPendingAgreementTenancyForUnit(
  supabase: SupabaseClient,
  unitId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_SELECT)
    .eq("unit_id", unitId)
    .eq("tenancy_status", "active")
    .is("agreement_live_at", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle<TenancyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markTenancyAgreementLive(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const liveAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("tenancies")
    .update({
      agreement_live_at: liveAt,
      status: "active",
      tenancy_status: "active",
    })
    .eq("id", tenancyId)
    .eq("tenancy_status", "active")
    .is("agreement_live_at", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .select(TENANCY_SELECT)
    .single<TenancyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function confirmTenancyCharges(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    landlordId: string;
  },
) {
  const { data, error } = await supabase
    .from("tenancies")
    .update({
      charges_confirmed_at: new Date().toISOString(),
    })
    .eq("id", params.tenancyId)
    .eq("landlord_id", params.landlordId)
    .eq("tenancy_status", "active")
    .is("agreement_live_at", null)
    .is("charges_confirmed_at", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .select(TENANCY_DETAIL_SELECT)
    .single<TenancyDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenancyPipelineSummariesForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(
      `
      id,
      tenant_id,
      tenancy_status,
      agreement_live_at,
      charges_confirmed_at,
      tenancy_agreement_documents (
        document_status
      )
    `,
    )
    .eq("landlord_id", landlordId)
    .eq("tenancy_status", "active")
    .is("deleted_at", null)
    .is("archived_at", null)
    .returns<
      {
        id: string;
        tenant_id: string;
        tenancy_status: TenancyLifecycleStatus;
        agreement_live_at: string | null;
        charges_confirmed_at: string | null;
        tenancy_agreement_documents:
          | {
              document_status:
                | "draft"
                | "finalized"
                | "sent_to_tenant"
                | "accepted"
                | "voided";
            }
          | {
              document_status:
                | "draft"
                | "finalized"
                | "sent_to_tenant"
                | "accepted"
                | "voided";
            }[]
          | null;
      }[]
    >();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActiveTenancyForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_DETAIL_SELECT)
    .eq("tenant_id", tenantId)
    .eq("tenancy_status", "active")
    .not("agreement_live_at", "is", null)
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
    .eq("tenancy_status", "active")
    .not("agreement_live_at", "is", null)
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
  const rentDueDay = getRentAnchorDay(params.input.startDate);
  const rentAnchorMonth = getRentAnchorMonth(params.input.startDate);
  const nextRentChargeDate = calculateNextRentChargeDate(params.input.endDate);

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
      reminder_interval_days: params.input.reminderIntervalDays,

      rent_due_day: rentDueDay,
      rent_anchor_month: rentAnchorMonth,
      current_period_start: params.input.startDate,
      current_period_end: params.input.endDate,
      next_rent_charge_date: nextRentChargeDate,

      move_in_date: params.input.startDate,
      move_out_date: null,
      next_renewal_date: nextRentChargeDate,
      tenancy_status: "active",
      agreement_live_at: null,

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

export async function createLiveExistingTenantTenancy(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId: string;
    unitId: string;
    rentAmount: number;
    paymentFrequency: "monthly" | "quarterly" | "biannual" | "annual";
    currencyCode: string;
    moveInDate: string;
    currentPeriodStart: string;
    openingBalance: number;
    openingBalanceNote: string | null;
    agreementNotes: string | null;
  },
) {
  const currentPeriodEnd = calculateTenancyEndDate(
    params.currentPeriodStart,
    params.paymentFrequency as TenancyPaymentFrequency,
  );
  const nextRentChargeDate = calculateNextRentChargeDate(currentPeriodEnd);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("tenancies")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      unit_id: params.unitId,
      tenancy_reference: createTenancyReference(),

      rent_amount: params.rentAmount,
      payment_frequency: params.paymentFrequency,
      currency_code: params.currencyCode,

      start_date: params.moveInDate,
      end_date: currentPeriodEnd,
      renewal_notice_date: null,
      reminder_interval_days: 90,

      rent_due_day: getRentAnchorDay(params.moveInDate),
      rent_anchor_month: getRentAnchorMonth(params.moveInDate),
      current_period_start: params.currentPeriodStart,
      current_period_end: currentPeriodEnd,
      next_rent_charge_date: nextRentChargeDate,

      move_in_date: params.moveInDate,
      move_out_date: null,
      next_renewal_date: nextRentChargeDate,

      tenancy_status: "active",
      agreement_live_at: now,
      charges_confirmed_at: now,
      status: "active",

      opening_balance: params.openingBalance,
      opening_balance_note: params.openingBalanceNote,
      agreement_notes: params.agreementNotes,
    })
    .select(TENANCY_DETAIL_SELECT)
    .single<TenancyDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function renewTenancyPeriod(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase.rpc("renew_tenancy_period", {
    p_tenancy_id: tenancyId,
  });

  if (error) {
    throw error;
  }

  if (typeof data !== "string") {
    throw new Error("Renewal RPC did not return a tenancy id.");
  }

  return data;
}

export async function terminateTenancy(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    reason: string;
    actualMoveOutDate?: string | null;
  },
) {
  const archivedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("tenancies")
    .update({
      status: "terminated",
      tenancy_status: "terminated",
      move_out_date: params.actualMoveOutDate ?? toDateOnly(new Date()),
      agreement_notes: params.reason,
      archived_at: archivedAt,
    })
    .eq("id", params.tenancyId)
    .eq("tenancy_status", "active")
    .is("deleted_at", null)
    .is("archived_at", null)
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

export async function getRenewalTenanciesForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_DETAIL_SELECT)
    .eq("landlord_id", landlordId)
    .eq("tenancy_status", "active")
    .not("agreement_live_at", "is", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .not("next_rent_charge_date", "is", null)
    .order("next_rent_charge_date", { ascending: true })
    .returns<TenancyDetailRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUpcomingRenewalCountForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
  daysAhead = 90,
) {
  const today = new Date();
  const upperDate = addDays(today, daysAhead);

  const { count, error } = await supabase
    .from("tenancies")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("landlord_id", landlordId)
    .eq("tenancy_status", "active")
    .not("agreement_live_at", "is", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .not("next_rent_charge_date", "is", null)
    .lte("next_rent_charge_date", toDateOnly(upperDate));

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getTenancyById(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_DETAIL_SELECT)
    .eq("id", tenancyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .single<TenancyDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}
