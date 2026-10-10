import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type PublicDocumentProduct = "receipt" | "tenancy_agreement";
export type PublicDocumentCreditType = "free" | "paid";

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

function hashLinkKey(type: "phone" | "address", value: string) {
  return crypto
    .createHash("sha256")
    .update(`public-document-link:${type}:${value}`)
    .digest("hex");
}

export function normalizePublicDocumentLinkPhone(value: string) {
  const digits = value.normalize("NFKC").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export function normalizePublicDocumentLinkAddress(value: string) {
  const normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized.length >= 15 ? normalized : null;
}

export function isPublicDocumentIdentityLinkingEnabled() {
  return process.env.PUBLIC_DOCUMENT_IDENTITY_LINKING_ENABLED === "true";
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
  const linkPhone = normalizePublicDocumentLinkPhone(
    params.landlordPhoneNumber,
  );
  const linkAddress = normalizePublicDocumentLinkAddress(
    params.propertyAddress,
  );

  return {
    identityFingerprint: createPublicDocumentIdentityFingerprint(params),
    landlordNameFingerprint: hashIdentityPart(landlordName),
    landlordPhoneFingerprint: hashIdentityPart(landlordPhone),
    propertyAddressFingerprint: hashIdentityPart(propertyAddress),
    linkPhoneFingerprint: linkPhone ? hashLinkKey("phone", linkPhone) : null,
    linkAddressFingerprint: linkAddress
      ? hashLinkKey("address", linkAddress)
      : null,
  };
}

export async function consumePublicDocumentCredit(params: {
  identityFingerprint: string;
  product: PublicDocumentProduct;
  landlordNameFingerprint: string;
  landlordPhoneFingerprint: string;
  propertyAddressFingerprint: string;
  linkPhoneFingerprint: string | null;
  linkAddressFingerprint: string | null;
}) {
  const linkingEnabled = isPublicDocumentIdentityLinkingEnabled();
  const rpcName = linkingEnabled
    ? "consume_linked_public_document_credit"
    : "consume_public_document_credit_with_identity";
  const rpcParams = linkingEnabled
    ? {
        p_identity_fingerprint: params.identityFingerprint,
        p_product_type: params.product,
        p_landlord_name_fingerprint: params.landlordNameFingerprint,
        p_landlord_phone_fingerprint: params.landlordPhoneFingerprint,
        p_property_address_fingerprint: params.propertyAddressFingerprint,
        p_link_phone_fingerprint: params.linkPhoneFingerprint,
        p_link_address_fingerprint: params.linkAddressFingerprint,
      }
    : {
        p_identity_fingerprint: params.identityFingerprint,
        p_product_type: params.product,
        p_landlord_name_fingerprint: params.landlordNameFingerprint,
        p_landlord_phone_fingerprint: params.landlordPhoneFingerprint,
        p_property_address_fingerprint: params.propertyAddressFingerprint,
      };
  const { data, error } = await createSupabaseAdminClient().rpc(
    rpcName,
    rpcParams,
  );

  if (error) {
    throw error;
  }

  const result = data as {
    allowed?: boolean;
    remaining?: number;
    free_remaining?: number;
    paid_remaining?: number;
    supplying_entitlement_id?: string;
    credit_type?: PublicDocumentCreditType;
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
    supplyingEntitlementId: String(result.supplying_entitlement_id ?? ""),
    creditType: result.credit_type,
  };
}

export async function releasePublicDocumentCredit(params: {
  supplyingEntitlementId: string;
  product: PublicDocumentProduct;
  creditType: PublicDocumentCreditType;
}) {
  if (!params.supplyingEntitlementId || !params.creditType) {
    throw new Error(
      "The consumed credit did not include an exact release target.",
    );
  }

  const { data, error } = await createSupabaseAdminClient().rpc(
    "release_exact_public_document_credit",
    {
      p_entitlement_id: params.supplyingEntitlementId,
      p_product_type: params.product,
      p_credit_type: params.creditType,
    },
  );

  if (error) throw error;
  if (data !== true) {
    throw new Error("The consumed document credit could not be restored.");
  }
}
