import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type PublicDocumentProduct = "receipt" | "tenancy_agreement";

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeAddress(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function getFingerprintSecret() {
  const secret =
    process.env.PUBLIC_DOCUMENT_FINGERPRINT_SECRET ??
    process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    throw new AppError(
      "PUBLIC_DOCUMENT_FINGERPRINT_SECRET_MISSING",
      "Document usage is not configured.",
      500,
    );
  }

  return secret;
}

function hashIdentityPart(value: string) {
  return crypto
    .createHmac("sha256", getFingerprintSecret())
    .update(value)
    .digest("hex");
}

export function createPublicDocumentIdentityFingerprint(params: {
  landlordFullName: string;
  landlordPhoneNumber: string;
  propertyAddress: string;
}) {
  const canonicalIdentity = [
    normalizeName(params.landlordFullName),
    normalizePhone(params.landlordPhoneNumber),
    normalizeAddress(params.propertyAddress),
  ].join("\u001f");

  return crypto.createHash("sha256").update(canonicalIdentity).digest("hex");
}

export function createPublicDocumentIdentityFingerprints(params: {
  landlordFullName: string;
  landlordPhoneNumber: string;
  propertyAddress: string;
}) {
  const landlordName = normalizeName(params.landlordFullName);
  const landlordPhone = normalizePhone(params.landlordPhoneNumber);
  const propertyAddress = normalizeAddress(params.propertyAddress);

  return {
    identityFingerprint: createPublicDocumentIdentityFingerprint(params),
    landlordNameFingerprint: hashIdentityPart(landlordName),
    landlordPhoneFingerprint: hashIdentityPart(landlordPhone),
    propertyAddressFingerprint: hashIdentityPart(propertyAddress),
  };
}

export async function consumePublicDocumentCredit(params: {
  identityFingerprint: string;
  product: PublicDocumentProduct;
  landlordNameFingerprint: string;
  landlordPhoneFingerprint: string;
  propertyAddressFingerprint: string;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "consume_public_document_credit_with_identity",
    {
      p_identity_fingerprint: params.identityFingerprint,
      p_product_type: params.product,
      p_landlord_name_fingerprint: params.landlordNameFingerprint,
      p_landlord_phone_fingerprint: params.landlordPhoneFingerprint,
      p_property_address_fingerprint: params.propertyAddressFingerprint,
    },
  );

  if (error) {
    throw error;
  }

  const result = data as {
    allowed?: boolean;
    remaining?: number;
    free_remaining?: number;
    paid_remaining?: number;
  };

  if (!result.allowed) {
    throw new AppError(
      "PUBLIC_DOCUMENT_PAYMENT_REQUIRED",
      params.product === "receipt"
        ? "Your 3 free receipts have been used. Get 24 more receipts for ₦2,500."
        : "Your 3 free tenancy agreements have been used. Get 3 more agreements for ₦10,000.",
      402,
    );
  }

  return {
    remaining: Number(result.remaining ?? 0),
    freeRemaining: Number(result.free_remaining ?? 0),
    paidRemaining: Number(result.paid_remaining ?? 0),
  };
}
