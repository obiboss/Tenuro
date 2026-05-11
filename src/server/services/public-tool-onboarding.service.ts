import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createReceiptUsageEvent,
  getPublicGeneratedReceiptById,
  markPublicGeneratedReceiptClaimed,
  markPublicToolLeadAttached,
} from "@/server/repositories/public-tool-leads.repository";
import { createProperty } from "@/server/repositories/properties.repository";
import { upsertProfile } from "@/server/repositories/profiles.repository";
import { createTenantShell } from "@/server/repositories/tenants.repository";
import {
  createUnit,
  markUnitOccupied,
} from "@/server/repositories/units.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { hashPublicReceiptToken } from "@/server/services/public-receipt-generator.service";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { PublicReceiptSignupInput } from "@/server/validators/public-receipt-generator.schema";

function cleanOptional(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function splitCityState(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      lga: parts.slice(0, -1).join(", "),
      state: parts[parts.length - 1],
    };
  }

  return {
    lga: value.trim() || "Not specified",
    state: value.trim() || "Not specified",
  };
}

function getPropertyName(params: {
  propertyName: string | null;
  propertyAddress: string;
}) {
  return (
    cleanOptional(params.propertyName) ??
    params.propertyAddress.split(",")[0]?.trim() ??
    "Rental Property"
  );
}

function getUnitIdentifier(value: string | null) {
  return cleanOptional(value) ?? "Unit 1";
}

function assertClaimTokenValid(params: {
  storedHash: string | null;
  expiresAt: string | null;
  token: string;
}) {
  if (!params.storedHash || !params.expiresAt) {
    throw new AppError(
      "PUBLIC_RECEIPT_CLAIM_NOT_READY",
      "This receipt cannot be claimed. Please generate a fresh receipt.",
      404,
    );
  }

  if (hashPublicReceiptToken(params.token) !== params.storedHash) {
    throw new AppError(
      "PUBLIC_RECEIPT_CLAIM_INVALID",
      "This receipt claim link is invalid.",
      401,
    );
  }

  if (new Date(params.expiresAt).getTime() < Date.now()) {
    throw new AppError(
      "PUBLIC_RECEIPT_CLAIM_EXPIRED",
      "This receipt claim link has expired. Please generate a fresh receipt.",
      410,
    );
  }
}

export async function getPublicReceiptSignupContext(params: {
  receiptId: string;
  token: string;
}) {
  const supabase = createSupabaseAdminClient();
  const receipt = await getPublicGeneratedReceiptById(
    supabase,
    params.receiptId,
  );

  assertClaimTokenValid({
    storedHash: receipt.claim_token_hash,
    expiresAt: receipt.claim_token_expires_at,
    token: params.token,
  });

  if (receipt.owner_profile_id) {
    throw new AppError(
      "PUBLIC_RECEIPT_ALREADY_CLAIMED",
      "This receipt has already been attached to a BOPA account.",
      409,
    );
  }

  return {
    receiptId: receipt.id,
    landlordFullName: receipt.landlord_full_name,
    landlordPhoneNumber: receipt.landlord_phone_number,
    landlordEmail: receipt.landlord_email ?? "",
    receiptNumber: receipt.receipt_number,
    tenantFullName: receipt.tenant_full_name,
    propertyLabel: [
      receipt.property_name,
      receipt.unit_identifier,
      receipt.property_address,
      receipt.city_state,
    ]
      .filter(Boolean)
      .join(", "),
  };
}

export async function createLandlordAccountFromPublicReceipt(
  input: PublicReceiptSignupInput,
) {
  const adminSupabase = createSupabaseAdminClient();
  const serverSupabase = await createSupabaseServerClient();

  const receipt = await getPublicGeneratedReceiptById(
    adminSupabase,
    input.receiptId,
  );

  assertClaimTokenValid({
    storedHash: receipt.claim_token_hash,
    expiresAt: receipt.claim_token_expires_at,
    token: input.token,
  });

  if (receipt.owner_profile_id) {
    throw new AppError(
      "PUBLIC_RECEIPT_ALREADY_CLAIMED",
      "This receipt has already been attached to a BOPA account.",
      409,
    );
  }

  const normalizedLandlordPhone = normalisePhoneNumber(input.phoneNumber);
  const normalizedTenantPhone = normalisePhoneNumber(
    receipt.tenant_phone_number,
  );

  const { data, error } = await serverSupabase.auth.signUp({
    phone: normalizedLandlordPhone.e164,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        role: "landlord",
      },
    },
  });

  if (error || !data.user) {
    throw new AppError(
      "PUBLIC_RECEIPT_ACCOUNT_CREATE_FAILED",
      error?.message ?? "Account could not be created.",
      400,
    );
  }

  await upsertProfile(adminSupabase, {
    id: data.user.id,
    role: "landlord",
    fullName: input.fullName,
    phoneNumber: normalizedLandlordPhone.e164,
    email: cleanOptional(input.email),
  });

  const location = splitCityState(receipt.city_state);

  const property = await createProperty(adminSupabase, data.user.id, {
    propertyName: getPropertyName({
      propertyName: receipt.property_name,
      propertyAddress: receipt.property_address,
    }),
    address: receipt.property_address,
    state: location.state,
    lga: location.lga,
    propertyType: "flat_complex",
    countryCode: "NG",
    currencyCode: receipt.currency_code,
  });

  const unit = await createUnit(adminSupabase, {
    propertyId: property.id,
    buildingName: cleanOptional(receipt.property_name) ?? undefined,
    unitIdentifier: getUnitIdentifier(receipt.unit_identifier),
    unitType: "other",
    bedrooms: 0,
    bathrooms: 0,
    monthlyRent: null,
    annualRent: Number(receipt.rent_amount),
    currencyCode: receipt.currency_code,
  });

  const tenant = await createTenantShell(adminSupabase, data.user.id, {
    unitId: unit.id,
    fullName: receipt.tenant_full_name,
    phoneNumber: normalizedTenantPhone.e164,
    email: undefined,
    landlordNotes: `Created from public receipt ${receipt.receipt_number}. Rent period: ${receipt.rent_period_start} to ${receipt.rent_period_end}.`,
  });

  await markUnitOccupied(adminSupabase, unit.id);

  const claimedReceipt = await markPublicGeneratedReceiptClaimed(
    adminSupabase,
    {
      receiptId: receipt.id,
      ownerProfileId: data.user.id,
      propertyId: property.id,
      tenantId: tenant.id,
    },
  );

  if (claimedReceipt.lead_id) {
    await markPublicToolLeadAttached(adminSupabase, {
      leadId: claimedReceipt.lead_id,
      ownerProfileId: data.user.id,
    });
  }

  await createReceiptUsageEvent(adminSupabase, {
    leadId: claimedReceipt.lead_id ?? claimedReceipt.id,
    receiptId: claimedReceipt.id,
    eventType: "signup_completed",
    sourcePath: "/receipt-generator/claim",
    metadata: {
      receipt_number: claimedReceipt.receipt_number,
      profile_id: data.user.id,
      property_id: property.id,
      unit_id: unit.id,
      tenant_id: tenant.id,
    },
  });

  return {
    profileId: data.user.id,
    receiptId: claimedReceipt.id,
    propertyId: property.id,
    unitId: unit.id,
    tenantId: tenant.id,
  };
}
