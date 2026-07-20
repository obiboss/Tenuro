import "server-only";

import crypto from "node:crypto";
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import {
  isAgentSourcedTenant,
  isLandlordSourcedTenant,
  isOnboardingTokenFlowActive,
  isSubmittedForLandlordReview,
  TENANT_ONBOARDING_STATUSES,
} from "@/server/constants/onboarding-lifecycle";
import { AppError } from "@/server/errors/app-error";
import {
  getResolvedTenantByOnboardingTokenHash,
  getTenantByOnboardingTokenHash,
  getTenantForOnboardingInvite,
  officiallySubmitTenantOnboardingAfterPayment,
  saveTenantOnboardingDraft,
  submitTenantOnboardingProfile,
  updateTenantOnboardingToken,
} from "@/server/repositories/onboarding.repository";
import { getActivePropertyRulesForOnboarding } from "@/server/repositories/property-rules.repository";
import { replaceTenantGuarantor } from "@/server/repositories/guarantors.repository";
import { evaluateTenantKycAgainstPropertyRules } from "@/server/services/property-rule-kyc.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  landlordTenantAdditionalDetailsSchema,
  type SubmitTenantOnboardingInput,
} from "@/server/validators/onboarding.schema";
import { requireLandlordPlatformOperator } from "./auth.service";

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
    work_mode: input.workMode ?? null,
    office_address: input.officeAddress?.trim() || null,
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
    entity_type: AUDIT_ENTITY_TYPES.onboarding,
    entity_id: params.tenantId,
    description: params.description,
    metadata: params.metadata,
  });

  if (error) {
    throw error;
  }
}

function assertOnboardingTokenUsable(params: {
  onboardingStatus: string;
  onboardingTokenExpiresAt: string | null;
}) {
  if (!isOnboardingTokenFlowActive(params.onboardingStatus)) {
    throw new AppError(
      "TENANT_ONBOARDING_NOT_AVAILABLE",
      "This tenant onboarding link is no longer available.",
      400,
    );
  }

  if (!params.onboardingTokenExpiresAt) {
    throw new AppError(
      "INVALID_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link is invalid.",
      400,
    );
  }

  if (new Date(params.onboardingTokenExpiresAt).getTime() < Date.now()) {
    throw new AppError(
      "EXPIRED_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link has expired. Please ask the landlord to send a new link.",
      410,
    );
  }
}

async function prepareTenantOnboardingSubmission(
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

  assertOnboardingTokenUsable({
    onboardingStatus: tenant.onboarding_status,
    onboardingTokenExpiresAt: tenant.onboarding_token_expires_at,
  });

  const normalizedPhone = normalisePhoneNumber(input.phoneNumber);
  const normalizedInput: SubmitTenantOnboardingInput = {
    ...input,
    phoneNumber: normalizedPhone.e164,
    email: input.email?.trim() ? input.email.trim().toLowerCase() : "",
  };

  const kycAnswers = buildKycAnswers(normalizedInput);

  const propertyId = tenant.unit_id
    ? ((
        await supabase
          .from("units")
          .select("property_id")
          .eq("id", tenant.unit_id)
          .maybeSingle<{ property_id: string }>()
      ).data?.property_id ?? null)
    : null;

  const propertyRules = propertyId
    ? await getActivePropertyRulesForOnboarding(supabase, {
        propertyId,
        unitId: tenant.unit_id,
      })
    : [];

  const kycReviewFlags = evaluateTenantKycAgainstPropertyRules({
    rules: propertyRules,
    input: normalizedInput,
  });

  return {
    tenant,
    normalizedInput,
    kycAnswers,
    kycReviewFlags,
  };
}

export async function generateTenantOnboardingLink(tenantId: string) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = createSupabaseAdminClient();

  const tenant = await getTenantForOnboardingInvite(supabase, {
    tenantId,
    landlordId: landlord.id,
  });

  if (
    tenant.onboarding_status !== TENANT_ONBOARDING_STATUSES.invited &&
    tenant.onboarding_status !==
      TENANT_ONBOARDING_STATUSES.documentsSubmitted &&
    tenant.onboarding_status !== TENANT_ONBOARDING_STATUSES.profileComplete &&
    tenant.onboarding_status !==
      TENANT_ONBOARDING_STATUSES.submittedForLandlordReview
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
    `You have been invited to complete your tenant profile for ${unitName} at ${propertyName} on BOPA (Boldverse Property).`,
    "Please use the secure link below to complete your onboarding:",
    onboardingUrl,
    "",
    "BOPA - Property Management for Modern Landlords.",
  ].join("\n");

  const tenantPhone = normalisePhoneNumber(tenant.phone_number);

  await writeTenantOnboardingAuditLog({
    tenantId: tenant.id,
    landlordId: tenant.landlord_id,
    unitId: tenant.unit_id,
    actorRole: "landlord",
    actorProfileId: landlord.id,
    eventType: AUDIT_EVENT_TYPES.onboardingLinkSent,
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
    tenantWhatsappNumber: tenantPhone.national,
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

  assertOnboardingTokenUsable({
    onboardingStatus: tenant.onboarding_status,
    onboardingTokenExpiresAt: tenant.onboarding_token_expires_at,
  });

  return tenant;
}

export async function submitTenantOnboarding(
  input: SubmitTenantOnboardingInput,
) {
  const supabase = createSupabaseAdminClient();
  const { tenant, normalizedInput, kycAnswers, kycReviewFlags } =
    await prepareTenantOnboardingSubmission(input);

  const agentSourced = isAgentSourcedTenant({
    agentPropertyListingId: tenant.agent_property_listing_id,
    invitedByAgentId: tenant.invited_by_agent_id,
  });

  const landlordSourced = isLandlordSourcedTenant({
    agentPropertyListingId: tenant.agent_property_listing_id,
    invitedByAgentId: tenant.invited_by_agent_id,
  });

  if (agentSourced) {
    const updatedTenant = await saveTenantOnboardingDraft(supabase, {
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
      eventType: AUDIT_EVENT_TYPES.agentKycDraftSaved,
      description: "Agent-sourced tenant saved KYC draft for verification.",
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
        onboarding_source: "agent",
      },
    });

    return updatedTenant;
  }

  if (landlordSourced) {
    const additionalDetails = landlordTenantAdditionalDetailsSchema.parse({
      workMode: normalizedInput.workMode,
      officeAddress: normalizedInput.officeAddress,
      guarantorFullName: normalizedInput.guarantorFullName,
      guarantorPhoneNumber: normalizedInput.guarantorPhoneNumber,
      guarantorEmail: normalizedInput.guarantorEmail,
      guarantorAddress: normalizedInput.guarantorAddress,
      guarantorRelationship: normalizedInput.guarantorRelationship,
      guarantorIdDocumentPath: normalizedInput.guarantorIdDocumentPath,
    });
    const guarantorPhone = normalisePhoneNumber(
      additionalDetails.guarantorPhoneNumber,
    );

    await replaceTenantGuarantor(supabase, {
      tenantId: tenant.id,
      fullName: additionalDetails.guarantorFullName,
      phoneNumber: guarantorPhone.e164,
      email: additionalDetails.guarantorEmail?.trim()
        ? additionalDetails.guarantorEmail.trim().toLowerCase()
        : null,
      address: additionalDetails.guarantorAddress,
      relationshipToTenant: additionalDetails.guarantorRelationship,
      idDocumentPath: additionalDetails.guarantorIdDocumentPath || null,
    });

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
      eventType: AUDIT_EVENT_TYPES.tenantKycSubmitted,
      description: "Landlord-sourced tenant submitted KYC for landlord review.",
      metadata: {
        full_name: updatedTenant.full_name,
        phone_number: updatedTenant.phone_number,
        email: updatedTenant.email,
        id_type: normalizedInput.idType,
        id_document_uploaded: Boolean(normalizedInput.idDocumentPath),
        passport_photo_uploaded: Boolean(normalizedInput.passportPhotoPath),
        work_mode: additionalDetails.workMode,
        office_address_provided: Boolean(additionalDetails.officeAddress),
        guarantor_provided: true,
        guarantor_id_document_uploaded: Boolean(
          additionalDetails.guarantorIdDocumentPath,
        ),
        kyc_review_flags: kycReviewFlags,
        agent_property_listing_id: tenant.agent_property_listing_id,
        invited_by_agent_id: tenant.invited_by_agent_id,
        onboarding_source: "landlord",
        processing_fee_required: false,
      },
    });

    return updatedTenant;
  }

  throw new AppError(
    "TENANT_ONBOARDING_SOURCE_UNKNOWN",
    "This onboarding link cannot be processed.",
    400,
  );
}

export async function officiallySubmitAgentTenantOnboardingAfterPayment(params: {
  tenantId: string;
  verificationFeeIntentId: string;
  verificationFeePaidAt: string;
}) {
  const supabase = createSupabaseAdminClient();

  const submission = await officiallySubmitTenantOnboardingAfterPayment(
    supabase,
    {
      tenantId: params.tenantId,
      verificationFeeIntentId: params.verificationFeeIntentId,
      verificationFeePaidAt: params.verificationFeePaidAt,
      verificationFeeSource: "agent",
    },
  );

  if (submission.alreadySubmitted) {
    return submission.tenant;
  }

  await writeTenantOnboardingAuditLog({
    tenantId: submission.tenant.id,
    landlordId: submission.tenant.landlord_id,
    unitId: submission.tenant.unit_id,
    actorRole: "tenant",
    actorProfileId: null,
    eventType: AUDIT_EVENT_TYPES.agentOnboardingSubmitted,
    description:
      "Agent-sourced tenant onboarding officially submitted after verification fee payment.",
    metadata: {
      verification_fee_intent_id: params.verificationFeeIntentId,
      verification_fee_paid_at: params.verificationFeePaidAt,
      onboarding_status: submission.tenant.onboarding_status,
      agent_property_listing_id: submission.tenant.agent_property_listing_id,
      invited_by_agent_id: submission.tenant.invited_by_agent_id,
      payment_does_not_guarantee_approval: true,
    },
  });

  return submission.tenant;
}

export async function officiallySubmitLandlordTenantOnboardingAfterPayment(params: {
  tenantId: string;
  verificationFeeIntentId: string;
  verificationFeePaidAt: string;
}) {
  const supabase = createSupabaseAdminClient();

  const submission = await officiallySubmitTenantOnboardingAfterPayment(
    supabase,
    {
      tenantId: params.tenantId,
      verificationFeeIntentId: params.verificationFeeIntentId,
      verificationFeePaidAt: params.verificationFeePaidAt,
      verificationFeeSource: "landlord",
    },
  );

  if (submission.alreadySubmitted) {
    return submission.tenant;
  }

  await writeTenantOnboardingAuditLog({
    tenantId: submission.tenant.id,
    landlordId: submission.tenant.landlord_id,
    unitId: submission.tenant.unit_id,
    actorRole: "tenant",
    actorProfileId: null,
    eventType: AUDIT_EVENT_TYPES.landlordOnboardingSubmitted,
    description:
      "Landlord-sourced tenant onboarding officially submitted after verification fee payment.",
    metadata: {
      verification_fee_intent_id: params.verificationFeeIntentId,
      verification_fee_paid_at: params.verificationFeePaidAt,
      onboarding_status: submission.tenant.onboarding_status,
      payment_does_not_guarantee_approval: true,
    },
  });

  return submission.tenant;
}

export function isTenantOnboardingSubmittedForReview(onboardingStatus: string) {
  return isSubmittedForLandlordReview(onboardingStatus);
}
