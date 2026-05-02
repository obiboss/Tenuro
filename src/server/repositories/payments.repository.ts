import type { SupabaseClient } from "@supabase/supabase-js";

export type RentPaymentRow = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  tenancy_id: string;
  receipt_number: string | null;
  amount_paid: number;
  expected_period_amount: number;
  currency_code: string;
  payment_method: "paystack_gateway" | "bank_transfer" | "cash" | "other";
  payment_reference: string | null;
  payment_date: string;
  payment_for_period_start: string | null;
  payment_for_period_end: string | null;
  is_partial: boolean;
  balance_before: number;
  balance_after: number;
  verified_by_landlord: boolean;
  verified_at: string | null;
  receipt_status: "pending" | "generated" | "failed" | "voided";
  receipt_generated: boolean;
  receipt_path: string | null;
  notes: string | null;
  idempotency_key: string;
  status: "posted" | "reversed";
  created_at: string;
  tenants: {
    id: string;
    full_name: string;
    phone_number: string;
    email?: string | null;
  } | null;
  tenancies: {
    id: string;
    tenancy_reference: string;
    start_date?: string | null;
    end_date?: string | null;
    units: {
      id: string;
      unit_identifier: string;
      building_name: string | null;
      properties: {
        id: string;
        property_name: string;
        address?: string | null;
      } | null;
    } | null;
  } | null;
};

export type RentPaymentFilter = {
  dateFrom?: string;
  dateTo?: string;
};

const RENT_PAYMENT_SELECT = `
  id,
  landlord_id,
  tenant_id,
  tenancy_id,
  receipt_number,
  amount_paid,
  expected_period_amount,
  currency_code,
  payment_method,
  payment_reference,
  payment_date,
  payment_for_period_start,
  payment_for_period_end,
  is_partial,
  balance_before,
  balance_after,
  verified_by_landlord,
  verified_at,
  receipt_status,
  receipt_generated,
  receipt_path,
  notes,
  idempotency_key,
  status,
  created_at,
  tenants (
    id,
    full_name,
    phone_number,
    email
  ),
  tenancies (
    id,
    tenancy_reference,
    start_date,
    end_date,
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
  )
`;

export async function getRentPaymentsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
  filter: RentPaymentFilter = {},
) {
  let query = supabase
    .from("rent_payments")
    .select(RENT_PAYMENT_SELECT)
    .eq("landlord_id", landlordId)
    .order("payment_date", { ascending: false });

  if (filter.dateFrom) {
    query = query.gte("payment_date", filter.dateFrom);
  }

  if (filter.dateTo) {
    query = query.lt("payment_date", filter.dateTo);
  }

  const { data, error } = await query.returns<RentPaymentRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getRentCollectedForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
  filter: RentPaymentFilter,
) {
  let query = supabase
    .from("rent_payments")
    .select("amount_paid")
    .eq("landlord_id", landlordId)
    .eq("status", "posted");

  if (filter.dateFrom) {
    query = query.gte("payment_date", filter.dateFrom);
  }

  if (filter.dateTo) {
    query = query.lt("payment_date", filter.dateTo);
  }

  const { data, error } = await query.returns<{ amount_paid: number }[]>();

  if (error) {
    throw error;
  }

  return data.reduce(
    (total, payment) => total + Number(payment.amount_paid),
    0,
  );
}

export async function findPaymentByIdempotencyKey(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase
    .from("rent_payments")
    .select("id")
    .eq("landlord_id", params.landlordId)
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle<{
      id: string;
    }>();

  if (error) {
    throw error;
  }

  return data;
}

export async function recordGatewayRentPaymentViaRpc(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    amountPaid: number;
    paymentReference: string;
    paymentDate: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase.rpc("record_rent_payment", {
    p_tenancy_id: params.tenancyId,
    p_amount_paid: params.amountPaid,
    p_payment_method: "paystack_gateway",
    p_payment_reference: params.paymentReference,
    p_payment_date: params.paymentDate,
    p_period_start: params.periodStart ?? null,
    p_period_end: params.periodEnd ?? null,
    p_notes: "Paystack gateway payment",
    p_idempotency_key: params.idempotencyKey,
  });

  if (error) {
    throw error;
  }

  if (typeof data !== "string") {
    throw new Error("Payment RPC did not return a payment id.");
  }

  return data;
}

export async function recordManualRentPaymentViaRpc(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    amountPaid: number;
    paymentMethod: "bank_transfer" | "cash" | "other";
    paymentReference?: string | null;
    paymentDate: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    notes?: string | null;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase.rpc("record_rent_payment", {
    p_tenancy_id: params.tenancyId,
    p_amount_paid: params.amountPaid,
    p_payment_method: params.paymentMethod,
    p_payment_reference: params.paymentReference ?? null,
    p_payment_date: params.paymentDate,
    p_period_start: params.periodStart ?? null,
    p_period_end: params.periodEnd ?? null,
    p_notes: params.notes ?? null,
    p_idempotency_key: params.idempotencyKey,
  });

  if (error) {
    throw error;
  }

  if (typeof data !== "string") {
    throw new Error("Payment RPC did not return a payment id.");
  }

  return data;
}

export async function getRentPaymentById(
  supabase: SupabaseClient,
  paymentId: string,
) {
  const { data, error } = await supabase
    .from("rent_payments")
    .select(RENT_PAYMENT_SELECT)
    .eq("id", paymentId)
    .single<RentPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateRentPaymentReceipt(
  supabase: SupabaseClient,
  params: {
    paymentId: string;
    receiptPath: string;
    receiptNumber: string;
  },
) {
  const { data, error } = await supabase
    .from("rent_payments")
    .update({
      receipt_number: params.receiptNumber,
      receipt_path: params.receiptPath,
      receipt_generated: true,
      receipt_status: "generated",
      verified_at: new Date().toISOString(),
    })
    .eq("id", params.paymentId)
    .eq("status", "posted")
    .select(RENT_PAYMENT_SELECT)
    .single<RentPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markRentPaymentReceiptFailed(
  supabase: SupabaseClient,
  paymentId: string,
) {
  const { error } = await supabase
    .from("rent_payments")
    .update({
      receipt_status: "failed",
    })
    .eq("id", paymentId)
    .eq("status", "posted");

  if (error) {
    throw error;
  }
}
