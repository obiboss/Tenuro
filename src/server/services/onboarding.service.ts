import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  getResolvedTenantByOnboardingTokenHash,
  getTenantByOnboardingTokenHash,
  getTenantForOnboardingInvite,
  submitTenantOnboardingProfile,
  updateTenantOnboardingToken,
} from "@/server/repositories/onboarding.repository";
import { hasPaidAgentTenantProcessingFee } from "@/server/services/agent-processing-fee.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { SubmitTenantOnboardingInput } from "@/server/validators/onboarding.schema";
import { requireLandlord } from "./auth.service";

const TENANT_ONBOARDING_TOKEN_BYTES = 32;
const TENANT_ONBOARDING_TOKEN_DAYS = 7;

function createSecureToken() {
  return crypto
    .randomBytes(TENANT_ONBOARDING_TOKEN_BYTES)
    .toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function buildTenantOnboardingUrl(token: string) {
  return `${getAppBaseUrl()}/t/onboarding/${encodeURIComponent(token)}`;
}

function protectIdNumber(value: string) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(value.trim().toUpperCase())
    .digest("hex")}`;
}

function buildKycAnswers(input: SubmitTenantOnboardingInput) {
  return {
    has_pets: input.hasPets ?? null,
    occupant_count: input.occupantCount ?? null,
    property_use: input.propertyUse ?? null,
    has_children_under_five: input.hasChildrenUnderFive ?? null,
    monthly_income_range: input.monthlyIncomeRange ?? null,
    can_provide_guarantor: input.canProvideGuarantor ?? null,
    will_use_shortlet: input.willUseShortlet ?? null,
    will_sublet: input.willSublet ?? null,
    will_run_customer_facing_business:
      input.willRunCustomerFacingBusiness ?? null,
    will_use_heavy_generator_or_equipment:
      input.willUseHeavyGeneratorOrEquipment ?? null,
    will_host_large_gatherings: input.willHostLargeGatherings ?? null,
  };
}

function buildKycReviewFlags(input: SubmitTenantOnboardingInput) {
  const flags: Record<string, unknown>[] = [];

  if (input.hasPets === "yes") {
    flags.push({
      code: "has_pets",
      severity: "review",
      message: "Tenant indicated they have pets.",
    });
  }

  if (input.propertyUse === "commercial") {
    flags.push({
      code: "commercial_use",
      severity: "review",
      message: "Tenant wants to use the property for business.",
    });
  }

  if (input.hasChildrenUnderFive === "yes") {
    flags.push({
      code: "children_under_five",
      severity: "review",
      message: "Tenant indicated children under 5 may live in the unit.",
    });
  }

  if (input.canProvideGuarantor === "no") {
    flags.push({
      code: "cannot_provide_guarantor",
      severity: "review",
      message: "Tenant cannot provide a guarantor if required.",
    });
  }

  if (input.willUseShortlet === "yes") {
    flags.push({
      code: "shortlet_use",
      severity: "review",
      message: "Tenant may use the property for short-let or Airbnb.",
    });
  }

  if (input.willSublet === "yes") {
    flags.push({
      code: "subletting",
      severity: "review",
      message: "Tenant may sublet the property.",
    });
  }

  if (input.willRunCustomerFacingBusiness === "yes") {
    flags.push({
      code: "customer_facing_business",
      severity: "review",
      message: "Tenant may run a customer-facing business.",
    });
  }

  if (input.willUseHeavyGeneratorOrEquipment === "yes") {
    flags.push({
      code: "heavy_generator_or_equipment",
      severity: "review",
      message: "Tenant may use heavy generator, machines, or equipment.",
    });
  }

  if (input.willHostLargeGatherings === "yes") {
    flags.push({
      code: "large_gatherings",
      severity: "review",
      message: "Tenant may host regular parties or large gatherings.",
    });
  }

  return flags;
}

function isAgentSourcedTenant(params: {
  agentPropertyListingId: string | null;
  invitedByAgentId: string | null;
}) {
  return Boolean(params.agentPropertyListingId && params.invitedByAgentId);
}

async function assertAgentProcessingFeePaidBeforeKyc(params: {
  tenantId: string;
  agentPropertyListingId: string | null;
  invitedByAgentId: string | null;
}) {
  if (
    !isAgentSourcedTenant({
      agentPropertyListingId: params.agentPropertyListingId,
      invitedByAgentId: params.invitedByAgentId,
    })
  ) {
    return;
  }

  const hasPaid = await hasPaidAgentTenantProcessingFee(params.tenantId);

  if (!hasPaid) {
    throw new AppError(
      "AGENT_PROCESSING_FEE_REQUIRED",
      "Please pay the tenant processing fee before submitting your KYC form.",
      402,
    );
  }
}

async function writeTenantOnboardingAuditLog(params: {
  tenantId: string;
  landlordId: string;
  unitId: string;
  actorRole: "landlord" | "tenant";
  actorProfileId: string | null;
  eventType: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: params.landlordId,
    tenant_id: params.tenantId,
    tenancy_id: null,
    unit_id: params.unitId,
    property_id: null,
    actor_profile_id: params.actorProfileId,
    actor_role: params.actorRole,
    event_type: params.eventType,
    entity_type: "tenant",
    entity_id: params.tenantId,
    description: params.description,
    metadata: params.metadata,
  });

  if (error) {
    throw error;
  }
}

export async function generateTenantOnboardingLink(tenantId: string) {
  const landlord = await requireLandlord();
  const supabase = createSupabaseAdminClient();

  const tenant = await getTenantForOnboardingInvite(supabase, {
    tenantId,
    landlordId: landlord.id,
  });

  if (
    tenant.onboarding_status !== "invited" &&
    tenant.onboarding_status !== "profile_complete"
  ) {
    throw new AppError(
      "TENANT_ONBOARDING_NOT_AVAILABLE",
      "This tenant cannot receive an onboarding link in the current status.",
      400,
    );
  }

  const token = createSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + TENANT_ONBOARDING_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await updateTenantOnboardingToken(supabase, {
    tenantId: tenant.id,
    tokenHash,
    expiresAt,
  });

  const onboardingUrl = buildTenantOnboardingUrl(token);
  const propertyName =
    tenant.units?.properties?.property_name ?? "the property";
  const unitName = tenant.units?.unit_identifier ?? "your apartment";

  const whatsappMessage = [
    `Hello ${tenant.full_name},`,
    "",
    `You have been invited to complete your tenant profile for ${unitName} at ${propertyName} on Tenuro.`,
    "Please use the secure link below to complete your onboarding:",
    onboardingUrl,
    "",
    "Tenuro - Property records made simple.",
  ].join("\n");

  await writeTenantOnboardingAuditLog({
    tenantId: tenant.id,
    landlordId: tenant.landlord_id,
    unitId: tenant.unit_id,
    actorRole: "landlord",
    actorProfileId: landlord.id,
    eventType: "tenant_onboarding_link_generated",
    description: `Tenant onboarding link generated for ${tenant.full_name}.`,
    metadata: {
      tenant_name: tenant.full_name,
      tenant_phone_number: tenant.phone_number,
      onboarding_token_expires_at: expiresAt,
      property_name: propertyName,
      unit_identifier: unitName,
      agent_property_listing_id: tenant.agent_property_listing_id,
      invited_by_agent_id: tenant.invited_by_agent_id,
    },
  });

  return {
    tenant,
    onboardingUrl,
    whatsappMessage,
    tenantWhatsappNumber: tenant.phone_number,
  };
}

export async function resolveTenantOnboardingToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(token);

  const tenant = await getResolvedTenantByOnboardingTokenHash(
    supabase,
    tokenHash,
  );

  if (!tenant) {
    throw new AppError(
      "INVALID_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link is invalid or has already been used.",
      404,
    );
  }

  if (
    tenant.onboarding_status !== "invited" &&
    tenant.onboarding_status !== "profile_complete"
  ) {
    throw new AppError(
      "TENANT_ONBOARDING_NOT_AVAILABLE",
      "This tenant onboarding link is no longer available.",
      400,
    );
  }

  if (!tenant.onboarding_token_expires_at) {
    throw new AppError(
      "INVALID_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link is invalid.",
      400,
    );
  }

  if (new Date(tenant.onboarding_token_expires_at).getTime() < Date.now()) {
    throw new AppError(
      "EXPIRED_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link has expired. Please ask the landlord to send a new link.",
      410,
    );
  }

  return tenant;
}

export async function submitTenantOnboarding(
  input: SubmitTenantOnboardingInput,
) {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(input.token);

  const tenant = await getTenantByOnboardingTokenHash(supabase, tokenHash);

  if (!tenant) {
    throw new AppError(
      "INVALID_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link is invalid or has already been used.",
      404,
    );
  }

  if (
    tenant.onboarding_status !== "invited" &&
    tenant.onboarding_status !== "profile_complete"
  ) {
    throw new AppError(
      "TENANT_ONBOARDING_NOT_AVAILABLE",
      "This tenant onboarding link is no longer available.",
      400,
    );
  }

  if (!tenant.onboarding_token_expires_at) {
    throw new AppError(
      "INVALID_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link is invalid.",
      400,
    );
  }

  if (new Date(tenant.onboarding_token_expires_at).getTime() < Date.now()) {
    throw new AppError(
      "EXPIRED_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link has expired. Please ask the landlord to send a new link.",
      410,
    );
  }

  await assertAgentProcessingFeePaidBeforeKyc({
    tenantId: tenant.id,
    agentPropertyListingId: tenant.agent_property_listing_id,
    invitedByAgentId: tenant.invited_by_agent_id,
  });

  const normalizedPhone = normalisePhoneNumber(input.phoneNumber);
  const normalizedInput: SubmitTenantOnboardingInput = {
    ...input,
    phoneNumber: normalizedPhone.e164,
    email: input.email?.trim() ? input.email.trim().toLowerCase() : "",
  };

  const kycAnswers = buildKycAnswers(normalizedInput);
  const kycReviewFlags = buildKycReviewFlags(normalizedInput);

  const updatedTenant = await submitTenantOnboardingProfile(supabase, {
    tenantId: tenant.id,
    input: normalizedInput,
    idNumberCiphertext: protectIdNumber(normalizedInput.idNumber),
    kycAnswers,
    kycReviewFlags,
  });

  await writeTenantOnboardingAuditLog({
    tenantId: tenant.id,
    landlordId: tenant.landlord_id,
    unitId: tenant.unit_id,
    actorRole: "tenant",
    actorProfileId: null,
    eventType: "tenant_onboarding_profile_submitted",
    description: "Tenant submitted onboarding profile.",
    metadata: {
      full_name: updatedTenant.full_name,
      phone_number: updatedTenant.phone_number,
      email: updatedTenant.email,
      id_type: normalizedInput.idType,
      id_document_uploaded: Boolean(normalizedInput.idDocumentPath),
      passport_photo_uploaded: Boolean(normalizedInput.passportPhotoPath),
      kyc_review_flags: kycReviewFlags,
      agent_property_listing_id: tenant.agent_property_listing_id,
      invited_by_agent_id: tenant.invited_by_agent_id,
    },
  });

  return updatedTenant;
}
