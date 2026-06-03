import "server-only";

import crypto from "node:crypto";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  createExistingTenantClaim,
  getExistingTenantClaimById,
  getExistingTenantClaimByTokenHash,
  listExistingTenantClaimsForLandlord,
  markExistingTenantClaimExpired,
  rejectExistingTenantClaim,
  submitExistingTenantClaim,
} from "@/server/repositories/existing-tenant-claims.repository";
import {
  getUnitById,
  getUnitWithPropertyById,
  type UnitStatus,
  type UnitType,
} from "@/server/repositories/units.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type {
  CreateExistingTenantClaimInput,
  RejectExistingTenantClaimInput,
  SubmitExistingTenantClaimInput,
} from "@/server/validators/existing-tenant-claim.schema";
import { requireLandlordPlatformOperator } from "./auth.service";

type ExistingTenantClaimAuditEventType = Parameters<
  typeof writeAuditLog
>[0]["eventType"];

export type ExistingTenantClaimUnitOption = {
  label: string;
  value: string;
  propertyName: string;
  unitIdentifier: string;
  buildingName: string | null;
  unitType: UnitType;
  annualRent: number | null;
  monthlyRent: number | null;
  currencyCode: string;
  status: UnitStatus;
};

const EXISTING_TENANT_CLAIM_TOKEN_BYTES = 32;
const EXISTING_TENANT_CLAIM_TOKEN_DAYS = 7;

function createSecureToken() {
  return crypto
    .randomBytes(EXISTING_TENANT_CLAIM_TOKEN_BYTES)
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

function buildExistingTenantClaimUrl(token: string) {
  return `${getAppBaseUrl()}/existing-tenant-claims/${encodeURIComponent(
    token,
  )}`;
}

function getTokenExpiry() {
  return new Date(
    Date.now() + EXISTING_TENANT_CLAIM_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function assertClaimPubliclySubmittable(params: {
  status: string;
  tokenExpiresAt: string;
}) {
  if (new Date(params.tokenExpiresAt).getTime() < Date.now()) {
    throw new AppError(
      "EXISTING_TENANT_CLAIM_EXPIRED",
      "This existing tenant claim link has expired. Please ask the landlord to send a new link.",
      410,
    );
  }

  if (params.status !== "pending") {
    throw new AppError(
      "EXISTING_TENANT_CLAIM_NOT_AVAILABLE",
      "This existing tenant claim link is no longer available.",
      400,
    );
  }
}

function buildClaimWhatsappMessage(params: {
  propertyName: string;
  unitIdentifier: string;
  claimUrl: string;
}) {
  return [
    "Hello,",
    "",
    `Your landlord has invited you to confirm your tenancy details for ${params.unitIdentifier} at ${params.propertyName} on BOPA (Boldverse Property).`,
    "",
    "Please use this secure link to confirm your name, phone number, rent amount, move-in date, and next rent due date:",
    params.claimUrl,
    "",
    "Your landlord will review and confirm the details before the tenancy record goes live.",
  ].join("\n");
}

async function writeExistingTenantClaimAudit(params: {
  landlordId: string;
  unitId: string;
  propertyId: string | null;
  actorProfileId: string | null;
  actorRole:
    | typeof AUDIT_ACTOR_ROLES.landlord
    | typeof AUDIT_ACTOR_ROLES.tenant;
  eventType: ExistingTenantClaimAuditEventType;
  entityId: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  await writeAuditLog({
    landlordId: params.landlordId,
    tenantId: null,
    tenancyId: null,
    unitId: params.unitId,
    propertyId: params.propertyId,
    actorProfileId: params.actorProfileId,
    actorRole: params.actorRole,
    eventType: params.eventType,
    entityType: AUDIT_ENTITY_TYPES.onboarding,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  });
}

export async function getCurrentLandlordExistingTenantClaimUnitOptions() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("units")
    .select(
      `
      id,
      unit_identifier,
      building_name,
      unit_type,
      annual_rent,
      monthly_rent,
      currency_code,
      status,
      properties!inner (
        id,
        landlord_id,
        property_name
      )
    `,
    )
    .eq("properties.landlord_id", landlord.id)
    .is("deleted_at", null)
    .not("status", "in", "(archived,unavailable,under_renovation)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((unit) => {
    const property = Array.isArray(unit.properties)
      ? unit.properties[0]
      : unit.properties;

    const propertyName = property?.property_name ?? "Property";
    const unitIdentifier = String(unit.unit_identifier);
    const buildingName =
      typeof unit.building_name === "string" ? unit.building_name : null;

    return {
      label: `${propertyName} · ${buildingName ? `${buildingName} · ` : ""}${unitIdentifier}`,
      value: String(unit.id),
      propertyName,
      unitIdentifier,
      buildingName,
      unitType: unit.unit_type as UnitType,
      annualRent:
        typeof unit.annual_rent === "number" ? unit.annual_rent : null,
      monthlyRent:
        typeof unit.monthly_rent === "number" ? unit.monthly_rent : null,
      currencyCode:
        typeof unit.currency_code === "string" ? unit.currency_code : "NGN",
      status: unit.status as UnitStatus,
    } satisfies ExistingTenantClaimUnitOption;
  });
}

export async function createExistingTenantClaimForCurrentLandlord(
  input: CreateExistingTenantClaimInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const [unit, unitWithProperty] = await Promise.all([
    getUnitById(supabase, input.unitId),
    getUnitWithPropertyById(supabase, input.unitId),
  ]);

  if (unitWithProperty.properties?.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to invite an existing tenant for this unit.",
      403,
    );
  }

  if (
    unit.status === "archived" ||
    unit.status === "unavailable" ||
    unit.status === "under_renovation"
  ) {
    throw new AppError(
      "UNIT_NOT_AVAILABLE",
      "This unit cannot receive an existing tenant claim link.",
      400,
    );
  }

  const token = createSecureToken();
  const tokenHash = hashToken(token);
  const tokenExpiresAt = getTokenExpiry();

  const claim = await createExistingTenantClaim(supabase, {
    landlordId: landlord.id,
    unitId: input.unitId,
    tokenHash,
    tokenExpiresAt,
    note: input.note?.trim() || null,
  });

  const claimUrl = buildExistingTenantClaimUrl(token);
  const propertyName =
    unitWithProperty.properties?.property_name ?? "the property";
  const whatsappMessage = buildClaimWhatsappMessage({
    propertyName,
    unitIdentifier: unitWithProperty.unit_identifier,
    claimUrl,
  });

  await writeExistingTenantClaimAudit({
    landlordId: landlord.id,
    unitId: unit.id,
    propertyId: unitWithProperty.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.onboardingLinkSent,
    entityId: claim.id,
    description: `Existing tenant claim link created for ${unitWithProperty.unit_identifier}.`,
    metadata: {
      existing_tenant_claim_id: claim.id,
      unit_identifier: unitWithProperty.unit_identifier,
      property_name: propertyName,
      token_expires_at: tokenExpiresAt,
    },
  });

  return {
    claim,
    claimUrl,
    whatsappMessage,
    expiresAt: tokenExpiresAt,
  };
}

export async function resolveExistingTenantClaimToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(token);
  const claim = await getExistingTenantClaimByTokenHash(supabase, tokenHash);

  if (!claim) {
    throw new AppError(
      "EXISTING_TENANT_CLAIM_NOT_FOUND",
      "This existing tenant claim link is invalid.",
      404,
    );
  }

  if (
    claim.status === "pending" &&
    new Date(claim.token_expires_at).getTime() < Date.now()
  ) {
    await markExistingTenantClaimExpired(supabase, claim.id);

    throw new AppError(
      "EXISTING_TENANT_CLAIM_EXPIRED",
      "This existing tenant claim link has expired. Please ask the landlord to send a new link.",
      410,
    );
  }

  return claim;
}

export async function submitExistingTenantClaimByToken(
  input: SubmitExistingTenantClaimInput,
) {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(input.token);
  const claim = await getExistingTenantClaimByTokenHash(supabase, tokenHash);

  if (!claim) {
    throw new AppError(
      "EXISTING_TENANT_CLAIM_NOT_FOUND",
      "This existing tenant claim link is invalid.",
      404,
    );
  }

  assertClaimPubliclySubmittable({
    status: claim.status,
    tokenExpiresAt: claim.token_expires_at,
  });

  const normalizedPhone = normalisePhoneNumber(input.phoneNumber);

  const submittedClaim = await submitExistingTenantClaim(supabase, {
    claimId: claim.id,
    fullName: input.fullName,
    phoneNumber: normalizedPhone.e164,
    email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
    moveInDate: input.moveInDate,
    claimedRentAmount: input.claimedRentAmount,
    claimedNextRentDueDate: input.claimedNextRentDueDate,
    paymentFrequency: input.paymentFrequency,
    tenantNotes: input.tenantNotes?.trim() || null,
  });

  await writeExistingTenantClaimAudit({
    landlordId: submittedClaim.landlord_id,
    unitId: submittedClaim.unit_id,
    propertyId: submittedClaim.units?.properties?.id ?? null,
    actorProfileId: null,
    actorRole: AUDIT_ACTOR_ROLES.tenant,
    eventType: AUDIT_EVENT_TYPES.tenantKycSubmitted,
    entityId: submittedClaim.id,
    description:
      "Existing tenant submitted tenancy details for landlord review.",
    metadata: {
      existing_tenant_claim_id: submittedClaim.id,
      tenant_full_name: submittedClaim.tenant_full_name,
      tenant_phone_number: submittedClaim.tenant_phone_number,
      tenant_claimed_rent_amount: submittedClaim.tenant_claimed_rent_amount,
      tenant_claimed_next_rent_due_date:
        submittedClaim.tenant_claimed_next_rent_due_date,
      tenant_move_in_date: submittedClaim.tenant_move_in_date,
      payment_frequency: submittedClaim.tenant_payment_frequency,
    },
  });

  return submittedClaim;
}

export async function getCurrentLandlordExistingTenantClaims() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  return listExistingTenantClaimsForLandlord(supabase, landlord.id);
}

export async function getCurrentLandlordExistingTenantClaim(claimId: string) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const claim = await getExistingTenantClaimById(supabase, claimId);

  if (claim.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this existing tenant claim.",
      403,
    );
  }

  return claim;
}

export async function rejectExistingTenantClaimForCurrentLandlord(
  input: RejectExistingTenantClaimInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const claim = await getExistingTenantClaimById(supabase, input.claimId);

  if (claim.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to reject this existing tenant claim.",
      403,
    );
  }

  const rejectedClaim = await rejectExistingTenantClaim(supabase, {
    claimId: input.claimId,
    landlordId: landlord.id,
    reviewedBy: landlord.id,
    reason: input.reason,
  });

  await writeExistingTenantClaimAudit({
    landlordId: landlord.id,
    unitId: claim.unit_id,
    propertyId: claim.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantRejected,
    entityId: claim.id,
    description: "Existing tenant claim was rejected.",
    metadata: {
      existing_tenant_claim_id: claim.id,
      tenant_full_name: claim.tenant_full_name,
      rejected_reason: input.reason,
    },
  });

  return rejectedClaim;
}
