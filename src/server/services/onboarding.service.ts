import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
} from "@/server/constants/notification-types";
import { APP_ROUTES, getAppBaseUrl } from "@/server/constants/routes";
import { AppError } from "@/server/errors/app-error";
import { createNotification } from "@/server/repositories/notifications.repository";
import {
  completeTenantOnboardingProfile,
  getTenantOnboardingContextByTokenHash,
  markTenantOnboardingTokenExpired,
  saveTenantOnboardingToken,
} from "@/server/repositories/onboarding.repository";
import { getActivePropertyRulesForOnboarding } from "@/server/repositories/property-rules.repository";
import type {
  PropertyRuleDetailRow,
  PropertyRuleMetadata,
} from "@/server/repositories/property-rules.repository";
import { getTenantById } from "@/server/repositories/tenants.repository";
import { getUnitWithPropertyById } from "@/server/repositories/units.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { sha256Hex } from "@/server/utils/crypto";
import { encryptText } from "@/server/utils/encryption";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  generateSecureToken,
  getExpiryDateFromNow,
} from "@/server/utils/tokens";
import type {
  MonthlyIncomeRange,
  TenantOnboardingSubmissionInput,
} from "@/server/validators/onboarding.schema";
import { requireLandlord } from "./auth.service";

type DynamicKycAnswer = {
  question: string;
  answer: unknown;
};

type KycDecisionItem = {
  ruleCode: string;
  ruleTitle: string;
  reason: string;
  tenantAnswer: unknown;
  expectedValue: unknown;
};

type KycDecision = {
  autoDeclineItems: KycDecisionItem[];
  reviewItems: KycDecisionItem[];
  answers: Record<string, DynamicKycAnswer>;
};

const incomeRanges: Record<
  MonthlyIncomeRange,
  {
    label: string;
    min: number;
    max: number | null;
  }
> = {
  below_100000: {
    label: "Below ₦100,000",
    min: 0,
    max: 99999,
  },
  "100000_249999": {
    label: "₦100,000 - ₦249,999",
    min: 100000,
    max: 249999,
  },
  "250000_499999": {
    label: "₦250,000 - ₦499,999",
    min: 250000,
    max: 499999,
  },
  "500000_999999": {
    label: "₦500,000 - ₦999,999",
    min: 500000,
    max: 999999,
  },
  "1000000_1999999": {
    label: "₦1,000,000 - ₦1,999,999",
    min: 1000000,
    max: 1999999,
  },
  "2000000_and_above": {
    label: "₦2,000,000 and above",
    min: 2000000,
    max: null,
  },
};

function buildTenantOnboardingMessage(params: {
  tenantName: string;
  landlordName: string;
  propertyName: string;
  unitName: string;
  onboardingUrl: string;
}) {
  return `Hello ${params.tenantName}, ${params.landlordName} has invited you to complete your tenant profile for ${params.unitName} at ${params.propertyName}. Please use this secure link to complete your rental record: ${params.onboardingUrl}`;
}

function getRuleCode(rule: PropertyRuleDetailRow) {
  const metadata = rule.metadata as PropertyRuleMetadata | null;

  return metadata?.rule_code ?? null;
}

function getRuleConfigNumber(rule: PropertyRuleDetailRow, key: string) {
  const metadata = rule.metadata as PropertyRuleMetadata | null;
  const value = metadata?.config?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function requireSelectedAnswer<T>(
  value: T | undefined,
  message: string,
): Exclude<T, undefined> {
  if (value === undefined || value === null || value === "") {
    throw new AppError("KYC_CHECK_REQUIRED", message, 400);
  }

  return value as Exclude<T, undefined>;
}

function addAnswer(
  answers: Record<string, DynamicKycAnswer>,
  key: string,
  question: string,
  answer: unknown,
) {
  answers[key] = {
    question,
    answer,
  };
}

function evaluateSelectedKycRules(params: {
  input: TenantOnboardingSubmissionInput;
  selectedRules: PropertyRuleDetailRow[];
}): KycDecision {
  const autoDeclineItems: KycDecisionItem[] = [];
  const reviewItems: KycDecisionItem[] = [];
  const answers: Record<string, DynamicKycAnswer> = {};

  for (const rule of params.selectedRules) {
    const ruleCode = getRuleCode(rule);

    if (!ruleCode || rule.status !== "active") {
      continue;
    }

    if (rule.enforcement === "information_only") {
      continue;
    }

    if (ruleCode === "pets_not_allowed") {
      const hasPets = requireSelectedAnswer(
        params.input.hasPets,
        "Select whether you have pets.",
      );

      addAnswer(answers, ruleCode, "Do you have pets?", hasPets);

      if (hasPets === "yes") {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason: "This property does not permit pets.",
          tenantAnswer: "Has pets",
          expectedValue: "No pets",
        });
      }
    }

    if (ruleCode === "maximum_occupants") {
      const maximumOccupants = getRuleConfigNumber(rule, "maximumOccupants");

      if (!maximumOccupants) {
        continue;
      }

      const occupantCount = requireSelectedAnswer(
        params.input.occupantCount,
        "Enter how many people will live in the unit.",
      );

      addAnswer(
        answers,
        ruleCode,
        "How many people will live in this unit?",
        occupantCount,
      );

      if (occupantCount > maximumOccupants) {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason: `This property allows a maximum of ${maximumOccupants} occupant${
            maximumOccupants === 1 ? "" : "s"
          }.`,
          tenantAnswer: occupantCount,
          expectedValue: maximumOccupants,
        });
      }
    }

    if (ruleCode === "residential_only") {
      const propertyUse = requireSelectedAnswer(
        params.input.propertyUse,
        "Select how you want to use the property.",
      );

      addAnswer(
        answers,
        ruleCode,
        "Will you use this property for living or business?",
        propertyUse,
      );

      if (propertyUse === "commercial") {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason: "This property is for residential use only.",
          tenantAnswer: "Business use",
          expectedValue: "Residential use",
        });
      }
    }

    if (ruleCode === "children_under_5_not_allowed") {
      const hasChildrenUnderFive = requireSelectedAnswer(
        params.input.hasChildrenUnderFive,
        "Select whether children under 5 will live here.",
      );

      addAnswer(
        answers,
        ruleCode,
        "Will children under 5 live here?",
        hasChildrenUnderFive,
      );

      if (hasChildrenUnderFive === "yes") {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason: "This property does not permit children under 5.",
          tenantAnswer: "Children under 5 will live here",
          expectedValue: "No children under 5",
        });
      }
    }

    if (ruleCode === "minimum_monthly_income") {
      const minimumMonthlyIncome = getRuleConfigNumber(
        rule,
        "minimumMonthlyIncome",
      );

      if (!minimumMonthlyIncome) {
        continue;
      }

      const monthlyIncomeRange = requireSelectedAnswer(
        params.input.monthlyIncomeRange,
        "Select your monthly income or regular cashflow range.",
      );
      const selectedRange = incomeRanges[monthlyIncomeRange];

      addAnswer(
        answers,
        ruleCode,
        "What is your monthly income or regular cashflow?",
        selectedRange.label,
      );

      if (
        selectedRange.max !== null &&
        selectedRange.max < minimumMonthlyIncome
      ) {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason:
            "Income or regular cashflow is below the requirement for this property.",
          tenantAnswer: selectedRange.label,
          expectedValue: `At least ₦${minimumMonthlyIncome.toLocaleString(
            "en-NG",
          )}`,
        });
      }
    }

    if (ruleCode === "guarantor_required") {
      const canProvideGuarantor = requireSelectedAnswer(
        params.input.canProvideGuarantor,
        "Select whether you can provide a guarantor if approved.",
      );

      addAnswer(
        answers,
        ruleCode,
        "Can you provide a guarantor if approved?",
        canProvideGuarantor,
      );

      if (canProvideGuarantor === "no") {
        reviewItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason: "Tenant said they cannot provide a guarantor if approved.",
          tenantAnswer: "Cannot provide guarantor",
          expectedValue: "Can provide guarantor",
        });
      }
    }

    if (ruleCode === "shortlet_not_allowed") {
      const willUseShortlet = requireSelectedAnswer(
        params.input.willUseShortlet,
        "Select whether you plan to use the property for short-let or Airbnb.",
      );

      addAnswer(
        answers,
        ruleCode,
        "Will you use this property for short-let, Airbnb, or daily rental?",
        willUseShortlet,
      );

      if (willUseShortlet === "yes") {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason: "This property cannot be used for short-let or Airbnb.",
          tenantAnswer: "Short-let or Airbnb use",
          expectedValue: "No short-let or Airbnb",
        });
      }
    }

    if (ruleCode === "subletting_not_allowed") {
      const willSublet = requireSelectedAnswer(
        params.input.willSublet,
        "Select whether you plan to rent the property to someone else.",
      );

      addAnswer(
        answers,
        ruleCode,
        "Will you rent this property or any part of it to someone else?",
        willSublet,
      );

      if (willSublet === "yes") {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason: "This property does not permit subletting.",
          tenantAnswer: "Plans to sublet",
          expectedValue: "No subletting",
        });
      }
    }

    if (ruleCode === "customer_facing_business_not_allowed") {
      const answer = requireSelectedAnswer(
        params.input.willRunCustomerFacingBusiness,
        "Select whether your business will bring customers, staff, or many visitors.",
      );

      addAnswer(
        answers,
        ruleCode,
        "Will your business bring customers, staff, or many visitors?",
        answer,
      );

      if (answer === "yes") {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason:
            "This property does not permit business use that brings customers, staff, or many visitors.",
          tenantAnswer: "Customer-facing business",
          expectedValue: "No customer-facing business",
        });
      }
    }

    if (ruleCode === "heavy_generator_or_equipment_not_allowed") {
      const answer = requireSelectedAnswer(
        params.input.willUseHeavyGeneratorOrEquipment,
        "Select whether you will use heavy generator, machines, or large equipment.",
      );

      addAnswer(
        answers,
        ruleCode,
        "Will you use heavy generator, machines, or large equipment?",
        answer,
      );

      if (answer === "yes") {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason:
            "This property does not permit heavy generator, machines, or large equipment.",
          tenantAnswer: "Heavy generator or equipment",
          expectedValue: "No heavy generator or equipment",
        });
      }
    }

    if (ruleCode === "large_gatherings_not_allowed") {
      const answer = requireSelectedAnswer(
        params.input.willHostLargeGatherings,
        "Select whether you will host regular parties, events, or large gatherings.",
      );

      addAnswer(
        answers,
        ruleCode,
        "Will you host regular parties, events, or large gatherings?",
        answer,
      );

      if (answer === "yes") {
        autoDeclineItems.push({
          ruleCode,
          ruleTitle: rule.title,
          reason:
            "This property does not permit regular parties, events, or large gatherings.",
          tenantAnswer: "Large gatherings",
          expectedValue: "No large gatherings",
        });
      }
    }
  }

  return {
    autoDeclineItems,
    reviewItems,
    answers,
  };
}

function buildKycAnswers(params: {
  input: TenantOnboardingSubmissionInput;
  decision: KycDecision;
  selectedRules: PropertyRuleDetailRow[];
}) {
  return {
    submitted_at: new Date().toISOString(),
    base_profile: {
      full_name: params.input.fullName,
      phone_number: params.input.phoneNumber,
      email: params.input.email || null,
      date_of_birth: params.input.dateOfBirth.toISOString().slice(0, 10),
      home_address: params.input.homeAddress,
      occupation: params.input.occupation,
      employer: params.input.employer || null,
      id_type: params.input.idType,
    },
    selected_rule_codes: params.selectedRules
      .map((rule) => getRuleCode(rule))
      .filter(Boolean),
    selected_rule_answers: params.decision.answers,
  };
}

function buildAutoDeclineReason(items: KycDecisionItem[]) {
  const firstItem = items[0];

  if (!firstItem) {
    return null;
  }

  return `Application automatically declined: ${firstItem.reason}`;
}

export async function generateTenantOnboardingLink(tenantId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to invite this tenant.",
      403,
    );
  }

  const tenantPhone = normalisePhoneNumber(tenant.phone_number);
  const unit = await getUnitWithPropertyById(supabase, tenant.unit_id);

  if (!unit.properties) {
    throw new AppError(
      "NOT_FOUND",
      "We could not find the property for this tenant.",
      404,
    );
  }

  if (unit.properties.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to invite this tenant.",
      403,
    );
  }

  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = getExpiryDateFromNow(72);
  const appBaseUrl = getAppBaseUrl();

  const onboardingUrl = `${appBaseUrl}${APP_ROUTES.onboarding.tenant}/${rawToken}`;

  await saveTenantOnboardingToken(supabase, {
    tenantId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  const messageBody = buildTenantOnboardingMessage({
    tenantName: tenant.full_name,
    landlordName: landlord.fullName,
    propertyName: unit.properties.property_name,
    unitName: unit.unit_identifier,
    onboardingUrl,
  });

  const notification = await createNotification(supabase, {
    landlordId: landlord.id,
    tenantId,
    channel: NOTIFICATION_CHANNELS.whatsapp,
    notificationType: NOTIFICATION_TYPES.onboardingInvite,
    messageBody,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId,
    unitId: tenant.unit_id,
    propertyId: unit.properties.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.onboardingLinkSent,
    entityType: AUDIT_ENTITY_TYPES.onboarding,
    entityId: tenantId,
    description: `Onboarding link sent to ${tenant.full_name}.`,
    metadata: {
      tenant_name: tenant.full_name,
      property_name: unit.properties.property_name,
      unit_identifier: unit.unit_identifier,
      notification_id: notification.id,
      expires_at: expiresAt.toISOString(),
      delivery_channel: NOTIFICATION_CHANNELS.whatsapp,
    },
  });

  return {
    onboardingUrl,
    expiresAt: expiresAt.toISOString(),
    notificationId: notification.id,
    messageBody,
    tenantWhatsappNumber: tenantPhone.national,
  };
}

export async function resolveTenantOnboardingToken(token: string) {
  const tokenHash = sha256Hex(token);
  const supabase = createSupabaseAdminClient();

  const tenant = await getTenantOnboardingContextByTokenHash(
    supabase,
    tokenHash,
  );

  if (!tenant) {
    throw new AppError(
      "INVALID_ONBOARDING_LINK",
      "This onboarding link is invalid. Please ask the landlord for a new link.",
      404,
    );
  }

  if (!tenant.onboarding_token_expires_at) {
    throw new AppError(
      "INVALID_ONBOARDING_LINK",
      "This onboarding link is invalid. Please ask the landlord for a new link.",
      404,
    );
  }

  const expiresAt = new Date(tenant.onboarding_token_expires_at);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    await markTenantOnboardingTokenExpired(supabase, tenant.id);

    throw new AppError(
      "ONBOARDING_LINK_EXPIRED",
      "This onboarding link has expired. Please ask the landlord for a new link.",
      410,
    );
  }

  if (tenant.onboarding_status === "approved") {
    throw new AppError(
      "TENANT_ALREADY_APPROVED",
      "Your tenant profile has already been approved.",
      400,
    );
  }

  if (tenant.onboarding_status === "rejected") {
    throw new AppError(
      "TENANT_REJECTED",
      "This tenant profile was not approved. Please contact the landlord.",
      400,
    );
  }

  const propertyId = tenant.units?.properties?.id ?? null;
  const propertyRules = propertyId
    ? await getActivePropertyRulesForOnboarding(supabase, {
        propertyId,
        unitId: tenant.unit_id,
      })
    : [];

  return {
    ...tenant,
    property_rules: propertyRules.filter(
      (rule) => rule.enforcement !== "information_only",
    ),
  };
}

export async function submitTenantOnboardingProfile(
  input: TenantOnboardingSubmissionInput,
) {
  const tenant = await resolveTenantOnboardingToken(input.token);
  const supabase = createSupabaseAdminClient();

  if (tenant.onboarding_status === "profile_complete") {
    throw new AppError(
      "ONBOARDING_ALREADY_SUBMITTED",
      "Your tenant profile has already been submitted for review.",
      400,
    );
  }

  const selectedRules = tenant.property_rules ?? [];
  const decision = evaluateSelectedKycRules({
    input,
    selectedRules,
  });

  const rejectedReason = buildAutoDeclineReason(decision.autoDeclineItems);
  const onboardingStatus = rejectedReason ? "rejected" : "profile_complete";
  const idNumberCiphertext = encryptText(input.idNumber);

  await completeTenantOnboardingProfile(supabase, {
    tenantId: tenant.id,
    input: {
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      email: input.email,
      dateOfBirth: input.dateOfBirth,
      homeAddress: input.homeAddress,
      occupation: input.occupation,
      employer: input.employer,
      idType: input.idType,
      idNumberCiphertext,
      idDocumentPath: input.idDocumentPath,
      passportPhotoPath: input.passportPhotoPath,
      onboardingStatus,
      rejectedReason,
      kycAnswers: buildKycAnswers({
        input,
        decision,
        selectedRules,
      }),
      kycReviewFlags: decision.reviewItems,
    },
  });

  await createNotification(supabase, {
    landlordId: tenant.landlord_id,
    tenantId: tenant.id,
    channel: NOTIFICATION_CHANNELS.whatsapp,
    notificationType: NOTIFICATION_TYPES.onboardingInvite,
    messageBody: `${input.fullName} has completed their tenant profile. Please review the submission in Tenuro.`,
  });

  const propertyId = tenant.units?.properties?.id ?? null;

  await writeAuditLog({
    landlordId: tenant.landlord_id,
    tenantId: tenant.id,
    unitId: tenant.unit_id,
    propertyId,
    actorProfileId: null,
    actorRole: AUDIT_ACTOR_ROLES.tenant,
    eventType: AUDIT_EVENT_TYPES.tenantKycSubmitted,
    entityType: AUDIT_ENTITY_TYPES.onboarding,
    entityId: tenant.id,
    description: `${input.fullName} submitted tenant KYC.`,
    metadata: {
      tenant_name: input.fullName,
      selected_rule_count: selectedRules.length,
      auto_decline_count: decision.autoDeclineItems.length,
      review_flag_count: decision.reviewItems.length,
    },
  });

  if (decision.autoDeclineItems.length > 0) {
    await writeAuditLog({
      landlordId: tenant.landlord_id,
      tenantId: tenant.id,
      unitId: tenant.unit_id,
      propertyId,
      actorProfileId: null,
      actorRole: AUDIT_ACTOR_ROLES.system,
      eventType: AUDIT_EVENT_TYPES.tenantAutoDeclined,
      entityType: AUDIT_ENTITY_TYPES.tenant,
      entityId: tenant.id,
      description: `${input.fullName} was automatically declined.`,
      metadata: {
        tenant_name: input.fullName,
        rejected_reason: rejectedReason,
        failed_checks: decision.autoDeclineItems,
      },
    });
  }

  if (decision.reviewItems.length > 0) {
    await writeAuditLog({
      landlordId: tenant.landlord_id,
      tenantId: tenant.id,
      unitId: tenant.unit_id,
      propertyId,
      actorProfileId: null,
      actorRole: AUDIT_ACTOR_ROLES.system,
      eventType: AUDIT_EVENT_TYPES.tenantKycFlaggedForReview,
      entityType: AUDIT_ENTITY_TYPES.tenant,
      entityId: tenant.id,
      description: `${input.fullName} has KYC answers requiring landlord review.`,
      metadata: {
        tenant_name: input.fullName,
        review_flags: decision.reviewItems,
      },
    });
  }

  return {
    tenantId: tenant.id,
    onboardingStatus,
  };
}
