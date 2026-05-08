import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentAllocationRecipientType = "landlord" | "agent" | "platform";

export type PaymentAllocationStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled";

export type PaymentAllocationInput = {
  gatewayPaymentIntentId: string;
  rentPaymentId?: string | null;
  landlordId: string;
  tenantId: string;
  tenancyId: string;
  recipientType: PaymentAllocationRecipientType;
  recipientProfileId?: string | null;
  agentPropertyListingId?: string | null;
  amount: number;
  currencyCode: string;
  allocationStatus?: PaymentAllocationStatus;
  metadata?: Record<string, unknown>;
};

export type PaymentAllocationRow = {
  id: string;
  gateway_payment_intent_id: string | null;
  rent_payment_id: string | null;
  landlord_id: string | null;
  tenant_id: string | null;
  tenancy_id: string | null;
  recipient_type: PaymentAllocationRecipientType;
  recipient_profile_id: string | null;
  agent_property_listing_id: string | null;
  amount: number;
  currency_code: string;
  allocation_status: PaymentAllocationStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const PAYMENT_ALLOCATION_SELECT = `
  id,
  gateway_payment_intent_id,
  rent_payment_id,
  landlord_id,
  tenant_id,
  tenancy_id,
  recipient_type,
  recipient_profile_id,
  agent_property_listing_id,
  amount,
  currency_code,
  allocation_status,
  metadata,
  created_at,
  updated_at
`;

export async function createPaymentAllocations(
  supabase: SupabaseClient,
  allocations: PaymentAllocationInput[],
) {
  if (allocations.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("payment_allocations")
    .insert(
      allocations.map((allocation) => ({
        gateway_payment_intent_id: allocation.gatewayPaymentIntentId,
        rent_payment_id: allocation.rentPaymentId ?? null,
        landlord_id: allocation.landlordId,
        tenant_id: allocation.tenantId,
        tenancy_id: allocation.tenancyId,
        recipient_type: allocation.recipientType,
        recipient_profile_id: allocation.recipientProfileId ?? null,
        agent_property_listing_id: allocation.agentPropertyListingId ?? null,
        amount: allocation.amount,
        currency_code: allocation.currencyCode,
        allocation_status: allocation.allocationStatus ?? "pending",
        metadata: allocation.metadata ?? {},
      })),
    )
    .select(PAYMENT_ALLOCATION_SELECT)
    .returns<PaymentAllocationRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markPaymentAllocationsPaidForIntent(
  supabase: SupabaseClient,
  params: {
    gatewayPaymentIntentId: string;
    rentPaymentId: string;
  },
) {
  const { data, error } = await supabase
    .from("payment_allocations")
    .update({
      rent_payment_id: params.rentPaymentId,
      allocation_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("gateway_payment_intent_id", params.gatewayPaymentIntentId)
    .eq("allocation_status", "pending")
    .select(PAYMENT_ALLOCATION_SELECT)
    .returns<PaymentAllocationRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
