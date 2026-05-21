import "server-only";

import { AppError } from "@/server/errors/app-error";
import type { PropertyRuleDetailRow } from "@/server/repositories/property-rules.repository";
import type { SubmitTenantOnboardingInput } from "@/server/validators/onboarding.schema";

type KycReviewFlag = {
  code: string;
  severity: "review" | "block";
  message: string;
  ruleCode?: string;
};

const monthlyIncomeRangeMinimums: Record<string, number> = {
  below_100000: 0,
  "100000_249999": 100000,
  "250000_499999": 250000,
  "500000_999999": 500000,
  "1000000_1999999": 1000000,
  "2000000_and_above": 2000000,
};

function getRuleCode(rule: PropertyRuleDetailRow) {
  return rule.metadata?.rule_code ?? null;
}

function getRuleNumber(rule: PropertyRuleDetailRow, key: string) {
  const value = rule.metadata?.config?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function createViolation(params: {
  rule: PropertyRuleDetailRow;
  code: string;
  message: string;
}): KycReviewFlag {
  return {
    code: params.code,
    severity:
      params.rule.enforcement === "blocks_onboarding" ? "block" : "review",
    message: params.message,
    ruleCode: getRuleCode(params.rule) ?? undefined,
  };
}

function evaluateRuleViolation(
  rule: PropertyRuleDetailRow,
  input: SubmitTenantOnboardingInput,
): KycReviewFlag | null {
  if (rule.status !== "active" || rule.enforcement === "information_only") {
    return null;
  }

  const ruleCode = getRuleCode(rule);

  if (!ruleCode) {
    return null;
  }

  if (ruleCode === "pets_not_allowed" && input.hasPets === "yes") {
    return createViolation({
      rule,
      code: "has_pets",
      message: "This property does not accept tenants with pets.",
    });
  }

  if (ruleCode === "maximum_occupants") {
    const maximumOccupants = getRuleNumber(rule, "maximumOccupants");

    if (
      maximumOccupants &&
      typeof input.occupantCount === "number" &&
      input.occupantCount > maximumOccupants
    ) {
      return createViolation({
        rule,
        code: "occupant_count_exceeded",
        message: `This property allows a maximum of ${maximumOccupants} occupant${
          maximumOccupants === 1 ? "" : "s"
        }.`,
      });
    }
  }

  if (ruleCode === "residential_only" && input.propertyUse === "commercial") {
    return createViolation({
      rule,
      code: "commercial_use",
      message: "This property is for residential use only.",
    });
  }

  if (
    ruleCode === "children_under_5_not_allowed" &&
    input.hasChildrenUnderFive === "yes"
  ) {
    return createViolation({
      rule,
      code: "children_under_five",
      message: "This property does not accept tenants with children under 5.",
    });
  }

  if (ruleCode === "minimum_monthly_income") {
    const minimumMonthlyIncome = getRuleNumber(rule, "minimumMonthlyIncome");

    if (minimumMonthlyIncome && input.monthlyIncomeRange) {
      const tenantMinimum =
        monthlyIncomeRangeMinimums[input.monthlyIncomeRange] ?? 0;

      if (tenantMinimum < minimumMonthlyIncome) {
        return createViolation({
          rule,
          code: "insufficient_income",
          message:
            "Your declared monthly income does not meet this property requirement.",
        });
      }
    }
  }

  if (ruleCode === "guarantor_required" && input.canProvideGuarantor === "no") {
    return createViolation({
      rule,
      code: "cannot_provide_guarantor",
      message: "This property requires a guarantor if approved.",
    });
  }

  if (ruleCode === "shortlet_not_allowed" && input.willUseShortlet === "yes") {
    return createViolation({
      rule,
      code: "shortlet_use",
      message: "This property does not allow short-let or Airbnb use.",
    });
  }

  if (ruleCode === "subletting_not_allowed" && input.willSublet === "yes") {
    return createViolation({
      rule,
      code: "subletting",
      message: "This property does not allow subletting.",
    });
  }

  if (
    ruleCode === "customer_facing_business_not_allowed" &&
    input.willRunCustomerFacingBusiness === "yes"
  ) {
    return createViolation({
      rule,
      code: "customer_facing_business",
      message:
        "This property does not allow customer-facing business activity.",
    });
  }

  if (
    ruleCode === "heavy_generator_or_equipment_not_allowed" &&
    input.willUseHeavyGeneratorOrEquipment === "yes"
  ) {
    return createViolation({
      rule,
      code: "heavy_generator_or_equipment",
      message:
        "This property does not allow heavy generators or large equipment.",
    });
  }

  if (
    ruleCode === "large_gatherings_not_allowed" &&
    input.willHostLargeGatherings === "yes"
  ) {
    return createViolation({
      rule,
      code: "large_gatherings",
      message:
        "This property does not allow regular parties or large gatherings.",
    });
  }

  return null;
}

function assertRequiredKycFields(
  rules: PropertyRuleDetailRow[],
  input: SubmitTenantOnboardingInput,
) {
  const activeRules = rules.filter(
    (rule) =>
      rule.status === "active" && rule.enforcement !== "information_only",
  );

  const missingFields: string[] = [];

  function requiresRule(ruleCode: string) {
    return activeRules.some((rule) => getRuleCode(rule) === ruleCode);
  }

  if (requiresRule("pets_not_allowed") && !input.hasPets) {
    missingFields.push("pets");
  }

  if (requiresRule("maximum_occupants") && !input.occupantCount) {
    missingFields.push("occupant count");
  }

  if (requiresRule("residential_only") && !input.propertyUse) {
    missingFields.push("property use");
  }

  if (requiresRule("children_under_5_not_allowed") && !input.hasChildrenUnderFive) {
    missingFields.push("children under 5");
  }

  if (requiresRule("minimum_monthly_income") && !input.monthlyIncomeRange) {
    missingFields.push("monthly income");
  }

  if (requiresRule("guarantor_required") && !input.canProvideGuarantor) {
    missingFields.push("guarantor availability");
  }

  if (requiresRule("shortlet_not_allowed") && !input.willUseShortlet) {
    missingFields.push("short-let use");
  }

  if (requiresRule("subletting_not_allowed") && !input.willSublet) {
    missingFields.push("subletting");
  }

  if (
    requiresRule("customer_facing_business_not_allowed") &&
    !input.willRunCustomerFacingBusiness
  ) {
    missingFields.push("customer-facing business use");
  }

  if (
    requiresRule("heavy_generator_or_equipment_not_allowed") &&
    !input.willUseHeavyGeneratorOrEquipment
  ) {
    missingFields.push("heavy equipment use");
  }

  if (
    requiresRule("large_gatherings_not_allowed") &&
    !input.willHostLargeGatherings
  ) {
    missingFields.push("large gatherings");
  }

  if (missingFields.length === 0) {
    return;
  }

  throw new AppError(
    "TENANT_KYC_INCOMPLETE",
    "Please answer all landlord requirement questions before submitting.",
    400,
  );
}

export function evaluateTenantKycAgainstPropertyRules(params: {
  rules: PropertyRuleDetailRow[];
  input: SubmitTenantOnboardingInput;
}) {
  assertRequiredKycFields(params.rules, params.input);

  const flags = params.rules
    .map((rule) => evaluateRuleViolation(rule, params.input))
    .filter((flag): flag is KycReviewFlag => Boolean(flag));

  const blockingFlags = flags.filter((flag) => flag.severity === "block");

  if (blockingFlags.length > 0) {
    throw new AppError(
      "TENANT_KYC_DISQUALIFIED",
      blockingFlags[0]?.message ??
        "Your application does not meet this property's requirements.",
      400,
    );
  }

  return flags.map(({ code, severity, message, ruleCode }) => ({
    code,
    severity,
    message,
    rule_code: ruleCode ?? null,
  }));
}
