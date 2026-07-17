import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ManagerPropertyChargeBearer,
  ManagerPropertyChargeBillingCycle,
} from "@/server/validators/manager-property-settings.schema";

export type ManagerPropertyServiceChargeSettingsRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  charge_code: string | null;
  charge_name: string;
  description: string | null;
  amount: number;
  currency_code: "NGN";
  status: "active" | "inactive" | "archived";
  charge_bearer: ManagerPropertyChargeBearer;
  billing_cycle: ManagerPropertyChargeBillingCycle;
  is_required_before_move_in: boolean;
  sort_order: number;
  created_by_profile_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const SERVICE_CHARGE_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  charge_code,
  charge_name,
  description,
  amount,
  currency_code,
  status,
  charge_bearer,
  billing_cycle,
  is_required_before_move_in,
  sort_order,
  created_by_profile_id,
  metadata,
  created_at,
  updated_at
`;

export async function listManagerPropertyServiceChargeSettings(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId: string;
    activeOnly?: boolean;
  },
) {
  let query = supabase
    .from("manager_property_service_charges")
    .select(SERVICE_CHARGE_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("property_id", params.propertyId);

  if (params.activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("charge_name", { ascending: true })
    .returns<ManagerPropertyServiceChargeSettingsRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function replaceManagerPropertyServiceChargeSettings(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    createdByProfileId: string;
    revisionId: string;
    charges: Array<{
      chargeCode: string | null;
      chargeName: string;
      description: string | null;
      amount: number;
      chargeBearer: ManagerPropertyChargeBearer;
      billingCycle: ManagerPropertyChargeBillingCycle;
      isRequiredBeforeMoveIn: boolean;
      sortOrder: number;
    }>;
  },
) {
  const existingCharges =
    await listManagerPropertyServiceChargeSettings(supabase, {
      organizationId: params.organizationId,
      propertyId: params.propertyId,
      activeOnly: true,
    });

  const existingIds = existingCharges.map((charge) => charge.id);

  if (existingIds.length > 0) {
    const { error: archiveError } = await supabase
      .from("manager_property_service_charges")
      .update({ status: "archived" })
      .eq("organization_id", params.organizationId)
      .eq("landlord_client_id", params.landlordClientId)
      .eq("property_id", params.propertyId)
      .in("id", existingIds);

    if (archiveError) {
      throw archiveError;
    }
  }

  if (params.charges.length === 0) {
    return [];
  }

  const { data, error: insertError } = await supabase
    .from("manager_property_service_charges")
    .insert(
      params.charges.map((charge) => ({
        organization_id: params.organizationId,
        landlord_client_id: params.landlordClientId,
        property_id: params.propertyId,
        charge_code: charge.chargeCode,
        charge_name: charge.chargeName,
        description: charge.description,
        amount: charge.amount,
        currency_code: "NGN",
        status: "active",
        charge_bearer: charge.chargeBearer,
        billing_cycle: charge.billingCycle,
        is_required_before_move_in:
          charge.chargeBearer === "tenant" &&
          charge.isRequiredBeforeMoveIn,
        sort_order: charge.sortOrder,
        created_by_profile_id: params.createdByProfileId,
        metadata: {
          source: "bopa_manager_property_settings",
          revision_id: params.revisionId,
        },
      })),
    )
    .select(SERVICE_CHARGE_SELECT)
    .returns<ManagerPropertyServiceChargeSettingsRow[]>();

  if (!insertError) {
    return data;
  }

  if (existingIds.length > 0) {
    const { error: restoreError } = await supabase
      .from("manager_property_service_charges")
      .update({ status: "active" })
      .eq("organization_id", params.organizationId)
      .eq("landlord_client_id", params.landlordClientId)
      .eq("property_id", params.propertyId)
      .in("id", existingIds);

    if (restoreError) {
      throw restoreError;
    }
  }

  throw insertError;
}
