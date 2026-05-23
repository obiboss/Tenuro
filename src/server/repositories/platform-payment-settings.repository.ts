import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PlatformPaymentSettingsRow,
  UpdatePlatformPaymentSettingsInput,
} from "@/server/types/platform-payment-settings.types";

const PLATFORM_PAYMENT_SETTINGS_SELECT = `
  id,
  agent_processing_fee_amount,
  agent_processing_fee_agent_share,
  agent_processing_fee_platform_share,
  is_agent_processing_fee_enabled,
  landlord_processing_fee_amount,
  landlord_processing_fee_landlord_share,
  landlord_processing_fee_platform_share,
  is_landlord_processing_fee_enabled,
  bopa_basic_annual_price_naira,
  bopa_pro_annual_price_naira,
  landlord_trial_days,
  created_at,
  updated_at
`;

export async function getPlatformPaymentSettingsRow(
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("platform_payment_settings")
    .select(PLATFORM_PAYMENT_SETTINGS_SELECT)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<PlatformPaymentSettingsRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePlatformPaymentSettingsRow(
  supabase: SupabaseClient,
  input: UpdatePlatformPaymentSettingsInput,
) {
  const { data, error } = await supabase
    .from("platform_payment_settings")
    .update({
      agent_processing_fee_amount: input.agentProcessingFeeAmount,
      agent_processing_fee_agent_share: input.agentProcessingFeeAgentShare,
      agent_processing_fee_platform_share: input.agentProcessingFeePlatformShare,
      is_agent_processing_fee_enabled: input.isAgentProcessingFeeEnabled,
      landlord_processing_fee_amount: input.landlordProcessingFeeAmount,
      landlord_processing_fee_landlord_share:
        input.landlordProcessingFeeLandlordShare,
      landlord_processing_fee_platform_share:
        input.landlordProcessingFeePlatformShare,
      is_landlord_processing_fee_enabled: input.isLandlordProcessingFeeEnabled,
      bopa_basic_annual_price_naira: input.bopaBasicAnnualPriceNaira,
      bopa_pro_annual_price_naira: input.bopaProAnnualPriceNaira,
      landlord_trial_days: input.landlordTrialDays,
      updated_at: new Date().toISOString(),
    })
    .eq("updated_at", input.expectedUpdatedAt)
    .select(PLATFORM_PAYMENT_SETTINGS_SELECT)
    .maybeSingle<PlatformPaymentSettingsRow>();

  if (error) {
    throw error;
  }

  return data;
}
