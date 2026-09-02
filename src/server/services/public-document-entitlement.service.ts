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

export async function consumePublicDocumentCredit(params: {
  identityFingerprint: string;
  product: PublicDocumentProduct;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "consume_public_document_credit",
    {
      p_identity_fingerprint: params.identityFingerprint,
      p_product_type: params.product,
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
