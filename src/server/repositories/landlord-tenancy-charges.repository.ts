import type { SupabaseClient } from "@supabase/supabase-js";
import { getLandlordChargePresetForName } from "@/lib/landlord-charge-presets";

export type LandlordChargeType =
  | "agreement_fee"
  | "caution_deposit"
  | "damages_deposit"
  | "service_charge"
  | "legal_fee"
  | "documentation_fee"
  | "other";

export type LandlordChargeStatus = "draft" | "active" | "archived";

export type LandlordTenancyChargeRow = {
  id: string;
  landlord_id: string;
  tenant_id: string | null;
  tenancy_id: string | null;
  unit_id: string | null;
  property_id: string | null;
  charge_name: string;
  description: string | null;
  amount: number;
  currency_code: string;
  status: LandlordChargeStatus;
  is_refundable: boolean;
  is_required_before_move_in: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type LandlordTenancyChargeInput = {
  landlordId: string;
  tenantId: string;
  tenancyId: string;
  unitId: string;
  propertyId: string | null;
  chargeName: string;
  description?: string | null;
  amount: number;
  currencyCode: string;
  isRefundable: boolean;
  isRequiredBeforeMoveIn: boolean;
  metadata?: Record<string, unknown>;
};

const LANDLORD_TENANCY_CHARGE_SELECT = `
  id,
  landlord_id,
  tenant_id,
  tenancy_id,
  unit_id,
  property_id,
  charge_name,
  description,
  amount,
  currency_code,
  status,
  is_refundable,
  is_required_before_move_in,
  metadata,
  created_at,
  updated_at
`;

function resolveLegacyChargeType(chargeName: string): LandlordChargeType {
  const preset = getLandlordChargePresetForName(chargeName);

  if (!preset) {
    return "other";
  }

  return preset.id as LandlordChargeType;
}

function buildLegacyChargeFields(chargeName: string) {
  const trimmedName = chargeName.trim();

  return {
    charge_name: trimmedName,
    label: trimmedName,
    charge_type: resolveLegacyChargeType(trimmedName),
  };
}

export async function createLandlordTenancyCharge(
  supabase: SupabaseClient,
  input: LandlordTenancyChargeInput,
) {
  const { data, error } = await supabase
    .from("landlord_tenancy_charges")
    .insert({
      landlord_id: input.landlordId,
      tenant_id: input.tenantId,
      tenancy_id: input.tenancyId,
      unit_id: input.unitId,
      property_id: input.propertyId,
      ...buildLegacyChargeFields(input.chargeName),
      description: input.description?.trim() ? input.description.trim() : null,
      amount: input.amount,
      currency_code: input.currencyCode,
      status: "active",
      is_refundable: input.isRefundable,
      is_required_before_move_in: input.isRequiredBeforeMoveIn,
      metadata: input.metadata ?? {},
    })
    .select(LANDLORD_TENANCY_CHARGE_SELECT)
    .single<LandlordTenancyChargeRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateLandlordTenancyCharge(
  supabase: SupabaseClient,
  params: {
    chargeId: string;
    landlordId: string;
    chargeName: string;
    description?: string | null;
    amount: number;
    currencyCode: string;
    isRefundable: boolean;
    isRequiredBeforeMoveIn: boolean;
  },
) {
  const { data, error } = await supabase
    .from("landlord_tenancy_charges")
    .update({
      ...buildLegacyChargeFields(params.chargeName),
      description: params.description?.trim()
        ? params.description.trim()
        : null,
      amount: params.amount,
      currency_code: params.currencyCode,
      is_refundable: params.isRefundable,
      is_required_before_move_in: params.isRequiredBeforeMoveIn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.chargeId)
    .eq("landlord_id", params.landlordId)
    .neq("status", "archived")
    .select(LANDLORD_TENANCY_CHARGE_SELECT)
    .single<LandlordTenancyChargeRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveLandlordTenancyCharge(
  supabase: SupabaseClient,
  params: {
    chargeId: string;
    landlordId: string;
  },
) {
  const { data, error } = await supabase
    .from("landlord_tenancy_charges")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.chargeId)
    .eq("landlord_id", params.landlordId)
    .neq("status", "archived")
    .select(LANDLORD_TENANCY_CHARGE_SELECT)
    .single<LandlordTenancyChargeRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActiveLandlordTenancyCharges(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    landlordId: string;
  },
) {
  const { data, error } = await supabase
    .from("landlord_tenancy_charges")
    .select(LANDLORD_TENANCY_CHARGE_SELECT)
    .eq("tenancy_id", params.tenancyId)
    .eq("landlord_id", params.landlordId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .returns<LandlordTenancyChargeRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLandlordTenancyChargesForTenancy(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    landlordId: string;
  },
) {
  const { data, error } = await supabase
    .from("landlord_tenancy_charges")
    .select(LANDLORD_TENANCY_CHARGE_SELECT)
    .eq("tenancy_id", params.tenancyId)
    .eq("landlord_id", params.landlordId)
    .neq("status", "archived")
    .order("created_at", { ascending: true })
    .returns<LandlordTenancyChargeRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export function sumActiveLandlordChargeAmount(
  charges: LandlordTenancyChargeRow[],
) {
  return charges.reduce((total, charge) => total + Number(charge.amount), 0);
}

export function normalizeChargeName(value: string) {
  return value.trim().toLowerCase();
}

export async function hasActiveChargeWithName(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    landlordId: string;
    chargeName: string;
    excludeChargeId?: string;
  },
) {
  const normalizedName = normalizeChargeName(params.chargeName);
  const activeCharges = await getActiveLandlordTenancyCharges(supabase, {
    tenancyId: params.tenancyId,
    landlordId: params.landlordId,
  });

  return activeCharges.some((charge) => {
    if (
      params.excludeChargeId &&
      charge.id === params.excludeChargeId
    ) {
      return false;
    }

    return normalizeChargeName(charge.charge_name) === normalizedName;
  });
}
