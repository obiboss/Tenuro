import "server-only";

import { cache } from "react";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  getPlatformPaymentSettingsRow,
  updatePlatformPaymentSettingsRow,
} from "@/server/repositories/platform-payment-settings.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { requirePlatformAdmin } from "@/server/services/platform-admin.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type {
  AgentProcessingFeeConfiguration,
  LandlordProcessingFeeConfiguration,
  LandlordSubscriptionPricing,
  PlatformPaymentSettings,
  PlatformPaymentSettingsRow,
  UpdatePlatformPaymentSettingsInput,
} from "@/server/types/platform-payment-settings.types";
import type { UpdatePlatformPaymentSettingsSchemaInput } from "@/server/validators/platform-payment-settings.schema";

const PROCESSING_FEE_CURRENCY = "NGN" as const;

function mapPlatformPaymentSettingsRow(
  row: PlatformPaymentSettingsRow,
): PlatformPaymentSettings {
  return {
    id: row.id,
    agentProcessingFeeAmount: Number(row.agent_processing_fee_amount),
    agentProcessingFeeAgentShare: Number(row.agent_processing_fee_agent_share),
    agentProcessingFeePlatformShare: Number(
      row.agent_processing_fee_platform_share,
    ),
    isAgentProcessingFeeEnabled: row.is_agent_processing_fee_enabled,
    landlordProcessingFeeAmount: Number(row.landlord_processing_fee_amount),
    landlordProcessingFeeLandlordShare: Number(
      row.landlord_processing_fee_landlord_share,
    ),
    landlordProcessingFeePlatformShare: Number(
      row.landlord_processing_fee_platform_share,
    ),
    isLandlordProcessingFeeEnabled: row.is_landlord_processing_fee_enabled,
    bopaBasicAnnualPriceNaira: Number(row.bopa_basic_annual_price_naira),
    bopaProAnnualPriceNaira: Number(row.bopa_pro_annual_price_naira),
    landlordTrialDays: Number(row.landlord_trial_days),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function validateAgentProcessingFeeSplit(input: {
  agentProcessingFeeAmount: number;
  agentProcessingFeeAgentShare: number;
  agentProcessingFeePlatformShare: number;
}) {
  if (
    input.agentProcessingFeeAmount < 0 ||
    input.agentProcessingFeeAgentShare < 0 ||
    input.agentProcessingFeePlatformShare < 0
  ) {
    throw new AppError(
      "PLATFORM_PAYMENT_SETTINGS_INVALID",
      "Payment amounts cannot be negative.",
      400,
    );
  }

  if (
    input.agentProcessingFeeAmount !==
    input.agentProcessingFeeAgentShare + input.agentProcessingFeePlatformShare
  ) {
    throw new AppError(
      "PLATFORM_PAYMENT_SETTINGS_SPLIT_MISMATCH",
      "Total fee must equal the agent share plus the platform share.",
      400,
    );
  }
}

export function validateLandlordProcessingFeeSplit(input: {
  landlordProcessingFeeAmount: number;
  landlordProcessingFeeLandlordShare: number;
  landlordProcessingFeePlatformShare: number;
}) {
  if (
    input.landlordProcessingFeeAmount < 0 ||
    input.landlordProcessingFeeLandlordShare < 0 ||
    input.landlordProcessingFeePlatformShare < 0
  ) {
    throw new AppError(
      "PLATFORM_PAYMENT_SETTINGS_INVALID",
      "Payment amounts cannot be negative.",
      400,
    );
  }

  if (
    input.landlordProcessingFeeAmount !==
    input.landlordProcessingFeeLandlordShare +
      input.landlordProcessingFeePlatformShare
  ) {
    throw new AppError(
      "PLATFORM_PAYMENT_SETTINGS_SPLIT_MISMATCH",
      "Total fee must equal the landlord share plus the platform share.",
      400,
    );
  }
}

/** @deprecated Use validateAgentProcessingFeeSplit */
export function validatePlatformPaymentSettingsSplit(input: {
  agentProcessingFeeAmount: number;
  agentProcessingFeeAgentShare: number;
  agentProcessingFeePlatformShare: number;
}) {
  validateAgentProcessingFeeSplit(input);
}

function toAgentProcessingFeeConfiguration(
  settings: PlatformPaymentSettings,
): AgentProcessingFeeConfiguration {
  validateAgentProcessingFeeSplit({
    agentProcessingFeeAmount: settings.agentProcessingFeeAmount,
    agentProcessingFeeAgentShare: settings.agentProcessingFeeAgentShare,
    agentProcessingFeePlatformShare: settings.agentProcessingFeePlatformShare,
  });

  return {
    settingsId: settings.id,
    totalAmount: settings.agentProcessingFeeAmount,
    agentShareAmount: settings.agentProcessingFeeAgentShare,
    platformShareAmount: settings.agentProcessingFeePlatformShare,
    isEnabled: settings.isAgentProcessingFeeEnabled,
    currencyCode: PROCESSING_FEE_CURRENCY,
    updatedAt: settings.updatedAt,
  };
}

function toLandlordProcessingFeeConfiguration(
  settings: PlatformPaymentSettings,
): LandlordProcessingFeeConfiguration {
  validateLandlordProcessingFeeSplit({
    landlordProcessingFeeAmount: settings.landlordProcessingFeeAmount,
    landlordProcessingFeeLandlordShare:
      settings.landlordProcessingFeeLandlordShare,
    landlordProcessingFeePlatformShare:
      settings.landlordProcessingFeePlatformShare,
  });

  return {
    settingsId: settings.id,
    totalAmount: settings.landlordProcessingFeeAmount,
    landlordShareAmount: settings.landlordProcessingFeeLandlordShare,
    platformShareAmount: settings.landlordProcessingFeePlatformShare,
    isEnabled: settings.isLandlordProcessingFeeEnabled,
    currencyCode: PROCESSING_FEE_CURRENCY,
    updatedAt: settings.updatedAt,
  };
}

function toLandlordSubscriptionPricing(
  settings: PlatformPaymentSettings,
): LandlordSubscriptionPricing {
  return {
    basicAnnualPriceNaira: settings.bopaBasicAnnualPriceNaira,
    proAnnualPriceNaira: settings.bopaProAnnualPriceNaira,
    landlordTrialDays: settings.landlordTrialDays,
  };
}

async function loadPlatformPaymentSettingsFromDatabase() {
  const supabase = createSupabaseAdminClient();
  const row = await getPlatformPaymentSettingsRow(supabase);

  if (!row) {
    throw new AppError(
      "PLATFORM_PAYMENT_SETTINGS_NOT_FOUND",
      "Platform payment settings are not configured.",
      500,
    );
  }

  return mapPlatformPaymentSettingsRow(row);
}

export const getPlatformPaymentSettings = cache(async () => {
  return loadPlatformPaymentSettingsFromDatabase();
});

export async function getAgentProcessingFeeConfiguration() {
  const settings = await getPlatformPaymentSettings();

  return toAgentProcessingFeeConfiguration(settings);
}

export async function getLandlordProcessingFeeConfiguration() {
  const settings = await getPlatformPaymentSettings();

  return toLandlordProcessingFeeConfiguration(settings);
}

export async function getLandlordSubscriptionPricingConfiguration() {
  const settings = await getPlatformPaymentSettings();

  return toLandlordSubscriptionPricing(settings);
}

export function assertAgentProcessingFeeEnabled(
  configuration: AgentProcessingFeeConfiguration,
) {
  if (!configuration.isEnabled) {
    throw new AppError(
      "AGENT_PROCESSING_FEE_DISABLED",
      "Agent verification and processing fee is currently disabled.",
      503,
    );
  }

  if (configuration.totalAmount <= 0) {
    throw new AppError(
      "AGENT_PROCESSING_FEE_INVALID",
      "Agent verification and processing fee is not configured correctly.",
      500,
    );
  }
}

export function assertLandlordProcessingFeeEnabled(
  configuration: LandlordProcessingFeeConfiguration,
) {
  if (!configuration.isEnabled) {
    throw new AppError(
      "LANDLORD_PROCESSING_FEE_DISABLED",
      "Verification and processing fee is currently disabled.",
      503,
    );
  }

  if (configuration.totalAmount <= 0) {
    throw new AppError(
      "LANDLORD_PROCESSING_FEE_INVALID",
      "Verification and processing fee is not configured correctly.",
      500,
    );
  }
}

export async function getPlatformAdminPaymentSettingsPageData() {
  await requirePlatformAdmin();

  const supabase = await createSupabaseServerClient();
  const row = await getPlatformPaymentSettingsRow(supabase);

  if (!row) {
    throw new AppError(
      "PLATFORM_PAYMENT_SETTINGS_NOT_FOUND",
      "Platform payment settings are not configured.",
      500,
    );
  }

  return mapPlatformPaymentSettingsRow(row);
}

export async function updatePlatformPaymentSettingsForPlatformAdmin(
  input: UpdatePlatformPaymentSettingsSchemaInput,
) {
  const admin = await requirePlatformAdmin();

  validateAgentProcessingFeeSplit({
    agentProcessingFeeAmount: input.agentProcessingFeeAmount,
    agentProcessingFeeAgentShare: input.agentProcessingFeeAgentShare,
    agentProcessingFeePlatformShare: input.agentProcessingFeePlatformShare,
  });

  validateLandlordProcessingFeeSplit({
    landlordProcessingFeeAmount: input.landlordProcessingFeeAmount,
    landlordProcessingFeeLandlordShare: input.landlordProcessingFeeLandlordShare,
    landlordProcessingFeePlatformShare:
      input.landlordProcessingFeePlatformShare,
  });

  const supabase = await createSupabaseServerClient();
  const currentRow = await getPlatformPaymentSettingsRow(supabase);

  if (!currentRow) {
    throw new AppError(
      "PLATFORM_PAYMENT_SETTINGS_NOT_FOUND",
      "Platform payment settings are not configured.",
      500,
    );
  }

  const previousSettings = mapPlatformPaymentSettingsRow(currentRow);

  const updateInput: UpdatePlatformPaymentSettingsInput = {
    agentProcessingFeeAmount: input.agentProcessingFeeAmount,
    agentProcessingFeeAgentShare: input.agentProcessingFeeAgentShare,
    agentProcessingFeePlatformShare: input.agentProcessingFeePlatformShare,
    isAgentProcessingFeeEnabled: input.isAgentProcessingFeeEnabled,
    landlordProcessingFeeAmount: input.landlordProcessingFeeAmount,
    landlordProcessingFeeLandlordShare: input.landlordProcessingFeeLandlordShare,
    landlordProcessingFeePlatformShare:
      input.landlordProcessingFeePlatformShare,
    isLandlordProcessingFeeEnabled: input.isLandlordProcessingFeeEnabled,
    bopaBasicAnnualPriceNaira: input.bopaBasicAnnualPriceNaira,
    bopaProAnnualPriceNaira: input.bopaProAnnualPriceNaira,
    landlordTrialDays: input.landlordTrialDays,
    expectedUpdatedAt: input.expectedUpdatedAt,
  };

  const updatedRow = await updatePlatformPaymentSettingsRow(
    supabase,
    updateInput,
  );

  if (!updatedRow) {
    throw new AppError(
      "PLATFORM_PAYMENT_SETTINGS_STALE",
      "Payment settings were updated by another admin. Refresh and try again.",
      409,
    );
  }

  const updatedSettings = mapPlatformPaymentSettingsRow(updatedRow);

  await writeAuditLog({
    actorProfileId: admin.id,
    actorRole: AUDIT_ACTOR_ROLES.platformAdmin,
    eventType: AUDIT_EVENT_TYPES.platformPaymentSettingsUpdated,
    entityType: AUDIT_ENTITY_TYPES.platformSettings,
    entityId: updatedSettings.id,
    description: "Platform payment settings were updated.",
    metadata: {
      acting_admin_id: admin.id,
      previous_values: {
        agent_processing_fee_amount: previousSettings.agentProcessingFeeAmount,
        agent_processing_fee_agent_share:
          previousSettings.agentProcessingFeeAgentShare,
        agent_processing_fee_platform_share:
          previousSettings.agentProcessingFeePlatformShare,
        is_agent_processing_fee_enabled:
          previousSettings.isAgentProcessingFeeEnabled,
        landlord_processing_fee_amount:
          previousSettings.landlordProcessingFeeAmount,
        landlord_processing_fee_landlord_share:
          previousSettings.landlordProcessingFeeLandlordShare,
        landlord_processing_fee_platform_share:
          previousSettings.landlordProcessingFeePlatformShare,
        is_landlord_processing_fee_enabled:
          previousSettings.isLandlordProcessingFeeEnabled,
        bopa_basic_annual_price_naira:
          previousSettings.bopaBasicAnnualPriceNaira,
        bopa_pro_annual_price_naira: previousSettings.bopaProAnnualPriceNaira,
        landlord_trial_days: previousSettings.landlordTrialDays,
        updated_at: previousSettings.updatedAt,
      },
      new_values: {
        agent_processing_fee_amount: updatedSettings.agentProcessingFeeAmount,
        agent_processing_fee_agent_share:
          updatedSettings.agentProcessingFeeAgentShare,
        agent_processing_fee_platform_share:
          updatedSettings.agentProcessingFeePlatformShare,
        is_agent_processing_fee_enabled:
          updatedSettings.isAgentProcessingFeeEnabled,
        landlord_processing_fee_amount:
          updatedSettings.landlordProcessingFeeAmount,
        landlord_processing_fee_landlord_share:
          updatedSettings.landlordProcessingFeeLandlordShare,
        landlord_processing_fee_platform_share:
          updatedSettings.landlordProcessingFeePlatformShare,
        is_landlord_processing_fee_enabled:
          updatedSettings.isLandlordProcessingFeeEnabled,
        bopa_basic_annual_price_naira:
          updatedSettings.bopaBasicAnnualPriceNaira,
        bopa_pro_annual_price_naira: updatedSettings.bopaProAnnualPriceNaira,
        landlord_trial_days: updatedSettings.landlordTrialDays,
        updated_at: updatedSettings.updatedAt,
      },
    },
  });

  return updatedSettings;
}
