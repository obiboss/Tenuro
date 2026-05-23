export type PlatformPaymentSettingsRow = {
  id: string;
  agent_processing_fee_amount: number;
  agent_processing_fee_agent_share: number;
  agent_processing_fee_platform_share: number;
  is_agent_processing_fee_enabled: boolean;
  landlord_processing_fee_amount: number;
  landlord_processing_fee_landlord_share: number;
  landlord_processing_fee_platform_share: number;
  is_landlord_processing_fee_enabled: boolean;
  bopa_basic_annual_price_naira: number;
  bopa_pro_annual_price_naira: number;
  landlord_trial_days: number;
  created_at: string;
  updated_at: string;
};

export type PlatformPaymentSettings = {
  id: string;
  agentProcessingFeeAmount: number;
  agentProcessingFeeAgentShare: number;
  agentProcessingFeePlatformShare: number;
  isAgentProcessingFeeEnabled: boolean;
  landlordProcessingFeeAmount: number;
  landlordProcessingFeeLandlordShare: number;
  landlordProcessingFeePlatformShare: number;
  isLandlordProcessingFeeEnabled: boolean;
  bopaBasicAnnualPriceNaira: number;
  bopaProAnnualPriceNaira: number;
  landlordTrialDays: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentProcessingFeeConfiguration = {
  settingsId: string;
  totalAmount: number;
  agentShareAmount: number;
  platformShareAmount: number;
  isEnabled: boolean;
  currencyCode: "NGN";
  updatedAt: string;
};

export type LandlordProcessingFeeConfiguration = {
  settingsId: string;
  totalAmount: number;
  landlordShareAmount: number;
  platformShareAmount: number;
  isEnabled: boolean;
  currencyCode: "NGN";
  updatedAt: string;
};

export type LandlordSubscriptionPricing = {
  basicAnnualPriceNaira: number;
  proAnnualPriceNaira: number;
  landlordTrialDays: number;
};

export type UpdatePlatformPaymentSettingsInput = {
  agentProcessingFeeAmount: number;
  agentProcessingFeeAgentShare: number;
  agentProcessingFeePlatformShare: number;
  isAgentProcessingFeeEnabled: boolean;
  landlordProcessingFeeAmount: number;
  landlordProcessingFeeLandlordShare: number;
  landlordProcessingFeePlatformShare: number;
  isLandlordProcessingFeeEnabled: boolean;
  bopaBasicAnnualPriceNaira: number;
  bopaProAnnualPriceNaira: number;
  landlordTrialDays: number;
  expectedUpdatedAt: string;
};
