import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createPublicGeneratedReceipt,
  createPublicToolLead,
  createReceiptUsageEvent,
  getPublicGeneratedReceiptById,
  updatePublicGeneratedReceiptWhatsappMessage,
  type PublicGeneratedReceiptRow,
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
  downloadUrl: string;
  claimUrl: string;
};

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  const vercelProjectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (vercelProjectUrl) {
    return `https://${vercelProjectUrl
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

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

function createSecureToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPublicReceiptToken(token: string) {
  return hashToken(token);
}

function hashesMatch(params: { token: string; storedHash: string }) {
  const receivedHash = hashToken(params.token);
  const receivedBuffer = Buffer.from(receivedHash, "hex");
  const storedBuffer = Buffer.from(params.storedHash, "hex");

  return (
    receivedBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, storedBuffer)
  );
}

function createDownloadExpiry() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  return expiry.toISOString();
}

function createClaimExpiry() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  return expiry.toISOString();
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
  downloadUrl: string;
}) {
  return [
    `Rent receipt ${params.receiptNumber}`,
    "",
    `Landlord: ${params.landlordFullName}`,
    `Tenant: ${params.tenantFullName}`,
    `Property: ${params.propertyLabel}`,
    `Amount: ${formatMoney(params.rentAmount)}`,
    `Payment date: ${formatDate(params.paymentDate)}`,
    `Rent period: ${formatDate(params.rentPeriodStart)} - ${formatDate(
      params.rentPeriodEnd,
    )}`,
    `Download PDF: ${params.downloadUrl}`,
    "",
    "Generated with BOPA — boldverseproperty.com",
  ].join("\n");
}

function buildDownloadUrl(params: { receiptId: string; token: string }) {
  return `${getAppUrl()}/receipt-generator/download/${encodeURIComponent(
    params.receiptId,
  )}?token=${encodeURIComponent(params.token)}`;
}

function buildClaimUrl(params: { receiptId: string; token: string }) {
  return `${getAppUrl()}/receipt-generator/claim/${encodeURIComponent(
    params.receiptId,
  )}?token=${encodeURIComponent(params.token)}`;
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

  const downloadToken = createSecureToken();
  const downloadTokenHash = hashToken(downloadToken);
  const downloadTokenExpiresAt = createDownloadExpiry();

  const claimToken = createSecureToken();
  const claimTokenHash = hashToken(claimToken);
  const claimTokenExpiresAt = createClaimExpiry();

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
    whatsappMessage: "",
    downloadTokenHash,
    downloadTokenExpiresAt,
    claimTokenHash,
    claimTokenExpiresAt,
    metadata: {
      acquisition_channel: "public_receipt_generator",
    },
  });

  const downloadUrl = buildDownloadUrl({
    receiptId: receipt.id,
    token: downloadToken,
  });

  const claimUrl = buildClaimUrl({
    receiptId: receipt.id,
    token: claimToken,
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
    downloadUrl,
  });

  const updatedReceipt = await updatePublicGeneratedReceiptWhatsappMessage(
    supabase,
    {
      receiptId: receipt.id,
      whatsappMessage,
    },
  );

  await createReceiptUsageEvent(supabase, {
    leadId: lead.id,
    receiptId: updatedReceipt.id,
    eventType: "receipt_generated",
    sourcePath: input.sourcePath,
    metadata: {
      rent_amount: input.rentAmount,
      rent_duration_months: rentDurationMonths,
      has_pdf_download: true,
      has_account_claim: true,
    },
  });

  return {
    leadId: lead.id,
    receiptId: updatedReceipt.id,
    receiptNumber: updatedReceipt.receipt_number,
    landlordFullName: updatedReceipt.landlord_full_name,
    tenantFullName: updatedReceipt.tenant_full_name,
    propertyLabel,
    rentAmount: Number(updatedReceipt.rent_amount),
    paymentDate: updatedReceipt.payment_date,
    rentPeriodStart: updatedReceipt.rent_period_start,
    rentPeriodEnd: updatedReceipt.rent_period_end,
    rentDurationMonths: updatedReceipt.rent_duration_months,
    paymentMethod: paymentMethodLabel(updatedReceipt.payment_method),
    whatsappMessage,
    watermarkText: "Generated with BOPA — boldverseproperty.com",
    downloadUrl,
    claimUrl,
  };
}

export async function getPublicGeneratedReceiptForDownload(params: {
  receiptId: string;
  token: string;
}): Promise<PublicGeneratedReceiptRow> {
  const supabase = createSupabaseAdminClient();
  const receipt = await getPublicGeneratedReceiptById(
    supabase,
    params.receiptId,
  );

  if (!receipt.download_token_hash || !receipt.download_token_expires_at) {
    throw new AppError(
      "PUBLIC_RECEIPT_DOWNLOAD_NOT_READY",
      "This receipt download is not ready.",
      404,
    );
  }

  if (
    !hashesMatch({
      token: params.token,
      storedHash: receipt.download_token_hash,
    })
  ) {
    throw new AppError(
      "PUBLIC_RECEIPT_DOWNLOAD_INVALID",
      "This receipt download link is invalid.",
      401,
    );
  }

  if (new Date(receipt.download_token_expires_at).getTime() < Date.now()) {
    throw new AppError(
      "PUBLIC_RECEIPT_DOWNLOAD_EXPIRED",
      "This receipt download link has expired. Please generate a fresh receipt.",
      410,
    );
  }

  await createReceiptUsageEvent(supabase, {
    leadId: receipt.lead_id,
    receiptId: receipt.id,
    eventType: "receipt_downloaded",
    sourcePath: "/receipt-generator/download",
    metadata: {
      receipt_number: receipt.receipt_number,
    },
  });

  return receipt;
}
