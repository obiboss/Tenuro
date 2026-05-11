import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createAgreementUsageEvent,
  createPublicGeneratedAgreement,
} from "@/server/repositories/public-agreement-generator.repository";
import { createPublicToolLead } from "@/server/repositories/public-tool-leads.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type {
  PublicAgreementDuration,
  PublicAgreementGeneratorInput,
} from "@/server/validators/public-agreement-generator.schema";

export type GeneratedPublicAgreementResult = {
  leadId: string;
  agreementId: string;
  agreementTitle: string;
  landlordFullName: string;
  tenantFullName: string;
  propertyLabel: string;
  rentAmount: number;
  cautionDepositAmount: number;
  tenancyStartDate: string;
  tenancyEndDate: string;
  tenancyDurationMonths: number;
  paymentFrequency: string;
  watermarkText: string;
};

function addMonths(date: Date, months: number) {
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  result.setUTCMonth(result.getUTCMonth() + months);

  return result;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function calculateTenancyEndDate(
  startDate: string,
  duration: PublicAgreementDuration,
) {
  const start = new Date(`${startDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime())) {
    throw new AppError(
      "INVALID_TENANCY_START_DATE",
      "Enter a valid tenancy start date.",
      400,
    );
  }

  const monthsByDuration: Record<PublicAgreementDuration, number> = {
    "6_months": 6,
    "1_year": 12,
    "2_years": 24,
  };

  const months = monthsByDuration[duration];
  const nextPeriodStart = addMonths(start, months);
  nextPeriodStart.setUTCDate(nextPeriodStart.getUTCDate() - 1);

  return {
    tenancyEndDate: toDateOnly(nextPeriodStart),
    tenancyDurationMonths: months,
  };
}

function cleanOptional(value: string | null | undefined) {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

function buildPropertyLabel(input: PublicAgreementGeneratorInput) {
  const parts = [
    cleanOptional(input.propertyName),
    cleanOptional(input.unitIdentifier),
    input.propertyAddress,
    input.cityState,
  ].filter(Boolean);

  return parts.join(", ");
}

function getPaymentFrequencyLabel(
  value: PublicAgreementGeneratorInput["paymentFrequency"],
) {
  if (value === "annual") {
    return "Annual";
  }

  if (value === "six_months") {
    return "Every 6 Months";
  }

  return "Monthly";
}

function getPropertyUseLabel(
  value: PublicAgreementGeneratorInput["propertyUse"],
) {
  if (value === "commercial") {
    return "Commercial";
  }

  if (value === "mixed_use") {
    return "Mixed Use";
  }

  return "Residential";
}

export async function generatePublicTenancyAgreement(
  input: PublicAgreementGeneratorInput,
): Promise<GeneratedPublicAgreementResult> {
  const supabase = createSupabaseAdminClient();

  const { tenancyEndDate, tenancyDurationMonths } = calculateTenancyEndDate(
    input.agreementStartDate,
    input.agreementDuration,
  );

  const landlordEmail = cleanOptional(input.landlordEmail);
  const tenantEmail = cleanOptional(input.tenantEmail);
  const propertyName = cleanOptional(input.propertyName);
  const unitIdentifier = cleanOptional(input.unitIdentifier);
  const additionalTerms = cleanOptional(input.additionalTerms);
  const propertyLabel = buildPropertyLabel(input);
  const agreementTitle = "Residential Tenancy Agreement";

  const lead = await createPublicToolLead(supabase, {
    landlordFullName: input.landlordFullName,
    landlordPhoneNumber: input.landlordPhoneNumber,
    landlordEmail,
    sourceTool: "agreement",
    sourcePath: input.sourcePath,
    sourceLocation: null,
    metadata: {
      acquisition_channel: "public_agreement_generator",
      agreement_duration: input.agreementDuration,
      property_use: input.propertyUse,
    },
  });

  const agreementSnapshot = {
    agreement_title: agreementTitle,
    landlord: {
      full_name: input.landlordFullName,
      phone_number: input.landlordPhoneNumber,
      email: landlordEmail,
    },
    tenant: {
      full_name: input.tenantFullName,
      phone_number: input.tenantPhoneNumber,
      email: tenantEmail,
    },
    property: {
      name: propertyName,
      address: input.propertyAddress,
      unit_identifier: unitIdentifier,
      city_state: input.cityState,
      property_use: input.propertyUse,
      property_use_label: getPropertyUseLabel(input.propertyUse),
    },
    tenancy: {
      rent_amount: input.rentAmount,
      caution_deposit_amount: input.cautionDepositAmount,
      currency_code: "NGN",
      tenancy_start_date: input.agreementStartDate,
      tenancy_end_date: tenancyEndDate,
      tenancy_duration_months: tenancyDurationMonths,
      payment_frequency: input.paymentFrequency,
      payment_frequency_label: getPaymentFrequencyLabel(input.paymentFrequency),
      renewal_notice_days: input.renewalNoticeDays,
    },
    terms: {
      additional_terms: additionalTerms,
    },
    watermark: "Generated with BOPA — boldverseproperty.com",
  };

  const agreement = await createPublicGeneratedAgreement(supabase, {
    leadId: lead.id,
    landlordFullName: input.landlordFullName,
    landlordPhoneNumber: input.landlordPhoneNumber,
    landlordEmail,
    tenantFullName: input.tenantFullName,
    tenantPhoneNumber: input.tenantPhoneNumber,
    propertyName,
    propertyAddress: input.propertyAddress,
    unitIdentifier,
    cityState: input.cityState,
    rentAmount: input.rentAmount,
    tenancyStartDate: input.agreementStartDate,
    tenancyEndDate,
    tenancyDurationMonths,
    agreementTitle,
    agreementSnapshot,
    metadata: {
      acquisition_channel: "public_agreement_generator",
      caution_deposit_amount: input.cautionDepositAmount,
      payment_frequency: input.paymentFrequency,
      renewal_notice_days: input.renewalNoticeDays,
      property_use: input.propertyUse,
    },
  });

  await createAgreementUsageEvent(supabase, {
    leadId: lead.id,
    agreementId: agreement.id,
    eventType: "agreement_generated",
    sourcePath: input.sourcePath,
    metadata: {
      rent_amount: input.rentAmount,
      caution_deposit_amount: input.cautionDepositAmount,
      tenancy_duration_months: tenancyDurationMonths,
      property_use: input.propertyUse,
    },
  });

  return {
    leadId: lead.id,
    agreementId: agreement.id,
    agreementTitle: agreement.agreement_title,
    landlordFullName: agreement.landlord_full_name,
    tenantFullName: agreement.tenant_full_name,
    propertyLabel,
    rentAmount: Number(agreement.rent_amount),
    cautionDepositAmount: input.cautionDepositAmount,
    tenancyStartDate: agreement.tenancy_start_date,
    tenancyEndDate: agreement.tenancy_end_date,
    tenancyDurationMonths: agreement.tenancy_duration_months,
    paymentFrequency: getPaymentFrequencyLabel(input.paymentFrequency),
    watermarkText: "Generated with BOPA — boldverseproperty.com",
  };
}
