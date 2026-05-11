import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createPublicGeneratedReceipt,
  createPublicToolLead,
  createReceiptUsageEvent,
} from "@/server/repositories/public-tool-leads.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type {
  PublicReceiptDuration,
  PublicReceiptGeneratorInput,
} from "@/server/validators/public-receipt-generator.schema";

export type GeneratedPublicReceiptResult = {
  leadId: string;
  receiptId: string;
  receiptNumber: string;
  landlordFullName: string;
  tenantFullName: string;
  propertyLabel: string;
  rentAmount: number;
  paymentDate: string;
  rentPeriodStart: string;
  rentPeriodEnd: string;
  rentDurationMonths: number;
  paymentMethod: string;
  whatsappMessage: string;
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

function calculateRentPeriodEnd(
  startDate: string,
  duration: PublicReceiptDuration,
) {
  const start = new Date(`${startDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime())) {
    throw new AppError(
      "INVALID_RENT_START_DATE",
      "Enter a valid rent start date.",
      400,
    );
  }

  const monthsByDuration: Record<PublicReceiptDuration, number> = {
    "6_months": 6,
    "1_year": 12,
    "2_years": 24,
  };

  const months = monthsByDuration[duration];
  const nextPeriodStart = addMonths(start, months);
  nextPeriodStart.setUTCDate(nextPeriodStart.getUTCDate() - 1);

  return {
    rentPeriodEnd: toDateOnly(nextPeriodStart),
    rentDurationMonths: months,
  };
}

function createReceiptNumber() {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `BOPA-REC-${new Date().getFullYear()}-${suffix}`;
}

function cleanOptional(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function paymentMethodLabel(
  method: PublicReceiptGeneratorInput["paymentMethod"],
) {
  if (method === "bank_transfer") {
    return "Bank Transfer";
  }

  if (method === "cash") {
    return "Cash";
  }

  if (method === "paystack_gateway") {
    return "Paystack";
  }

  return "Other";
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function buildPropertyLabel(input: PublicReceiptGeneratorInput) {
  const parts = [
    cleanOptional(input.propertyName),
    cleanOptional(input.unitIdentifier),
    input.propertyAddress,
    input.cityState,
  ].filter(Boolean);

  return parts.join(", ");
}

function buildReceiptWhatsappMessage(params: {
  receiptNumber: string;
  landlordFullName: string;
  tenantFullName: string;
  propertyLabel: string;
  rentAmount: number;
  paymentDate: string;
  rentPeriodStart: string;
  rentPeriodEnd: string;
}) {
  return [
    `Rent receipt ${params.receiptNumber}`,
    ``,
    `Landlord: ${params.landlordFullName}`,
    `Tenant: ${params.tenantFullName}`,
    `Property: ${params.propertyLabel}`,
    `Amount: ${formatMoney(params.rentAmount)}`,
    `Payment date: ${formatDate(params.paymentDate)}`,
    `Rent period: ${formatDate(params.rentPeriodStart)} - ${formatDate(params.rentPeriodEnd)}`,
    ``,
    `Generated with BOPA — boldverseproperty.com`,
  ].join("\n");
}

export async function generatePublicRentReceipt(
  input: PublicReceiptGeneratorInput,
): Promise<GeneratedPublicReceiptResult> {
  const supabase = createSupabaseAdminClient();

  const { rentPeriodEnd, rentDurationMonths } = calculateRentPeriodEnd(
    input.rentStartDate,
    input.rentDuration,
  );

  const landlordEmail = cleanOptional(input.landlordEmail);
  const propertyName = cleanOptional(input.propertyName);
  const unitIdentifier = cleanOptional(input.unitIdentifier);
  const receiptNumber = createReceiptNumber();
  const propertyLabel = buildPropertyLabel(input);

  const lead = await createPublicToolLead(supabase, {
    landlordFullName: input.landlordFullName,
    landlordPhoneNumber: input.landlordPhoneNumber,
    landlordEmail,
    sourceTool: "receipt",
    sourcePath: input.sourcePath,
    sourceLocation: cleanOptional(input.sourceLocation),
    metadata: {
      acquisition_channel: "public_receipt_generator",
      rent_duration: input.rentDuration,
    },
  });

  const whatsappMessage = buildReceiptWhatsappMessage({
    receiptNumber,
    landlordFullName: input.landlordFullName,
    tenantFullName: input.tenantFullName,
    propertyLabel,
    rentAmount: input.rentAmount,
    paymentDate: input.paymentDate,
    rentPeriodStart: input.rentStartDate,
    rentPeriodEnd,
  });

  const receiptSnapshot = {
    receipt_number: receiptNumber,
    landlord: {
      full_name: input.landlordFullName,
      phone_number: input.landlordPhoneNumber,
      email: landlordEmail,
    },
    tenant: {
      full_name: input.tenantFullName,
      phone_number: input.tenantPhoneNumber,
    },
    property: {
      name: propertyName,
      address: input.propertyAddress,
      unit_identifier: unitIdentifier,
      city_state: input.cityState,
    },
    payment: {
      rent_amount: input.rentAmount,
      currency_code: "NGN",
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod,
      rent_period_start: input.rentStartDate,
      rent_period_end: rentPeriodEnd,
      rent_duration_months: rentDurationMonths,
    },
    watermark: "Generated with BOPA — boldverseproperty.com",
  };

  const receipt = await createPublicGeneratedReceipt(supabase, {
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
    paymentDate: input.paymentDate,
    rentPeriodStart: input.rentStartDate,
    rentPeriodEnd,
    rentDurationMonths,
    paymentMethod: input.paymentMethod,
    receiptNumber,
    receiptSnapshot,
    whatsappMessage,
    metadata: {
      acquisition_channel: "public_receipt_generator",
    },
  });

  await createReceiptUsageEvent(supabase, {
    leadId: lead.id,
    receiptId: receipt.id,
    eventType: "receipt_generated",
    sourcePath: input.sourcePath,
    metadata: {
      rent_amount: input.rentAmount,
      rent_duration_months: rentDurationMonths,
    },
  });

  return {
    leadId: lead.id,
    receiptId: receipt.id,
    receiptNumber: receipt.receipt_number,
    landlordFullName: receipt.landlord_full_name,
    tenantFullName: receipt.tenant_full_name,
    propertyLabel,
    rentAmount: Number(receipt.rent_amount),
    paymentDate: receipt.payment_date,
    rentPeriodStart: receipt.rent_period_start,
    rentPeriodEnd: receipt.rent_period_end,
    rentDurationMonths: receipt.rent_duration_months,
    paymentMethod: paymentMethodLabel(receipt.payment_method),
    whatsappMessage: receipt.whatsapp_message ?? whatsappMessage,
    watermarkText: "Generated with BOPA — boldverseproperty.com",
  };
}
