import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  getTenantByOnboardingTokenHash,
  submitTenantOnboardingProfile,
} from "@/server/repositories/onboarding.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { SubmitTenantOnboardingInput } from "@/server/validators/onboarding.schema";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
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

async function writeTenantOnboardingAuditLog(params: {
  tenantId: string;
  landlordId: string;
  unitId: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: params.landlordId,
    tenant_id: params.tenantId,
    tenancy_id: null,
    unit_id: params.unitId,
    property_id: null,
    actor_profile_id: null,
    actor_role: "tenant",
    event_type: "tenant_onboarding_profile_submitted",
    entity_type: "tenant",
    entity_id: params.tenantId,
    description: "Tenant submitted onboarding profile.",
    metadata: params.metadata,
  });

  if (error) {
    throw error;
  }
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
      "This tenant onboarding link has expired. Please ask the agent or landlord to send a new link.",
      410,
    );
  }

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
    metadata: {
      full_name: updatedTenant.full_name,
      phone_number: updatedTenant.phone_number,
      email: updatedTenant.email,
      id_type: normalizedInput.idType,
      id_document_uploaded: Boolean(normalizedInput.idDocumentPath),
      passport_photo_uploaded: Boolean(normalizedInput.passportPhotoPath),
      kyc_review_flags: kycReviewFlags,
    },
  });

  return updatedTenant;
}
