import "server-only";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getGatewayPaymentIntentsForTenant } from "@/server/repositories/gateway-payment.repository";
import { upsertProfile } from "@/server/repositories/profiles.repository";
import {
  getTenantActivationTokenByHash,
  linkTenantToProfile,
  markTenantActivationTokenUsed,
  saveTenantActivationToken,
} from "@/server/repositories/tenant-activation.repository";
import { getTenantById } from "@/server/repositories/tenants.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { sha256Hex } from "@/server/utils/crypto";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  generateSecureToken,
  getExpiryDateFromNow,
} from "@/server/utils/tokens";
import type { ActivateTenantAccountInput } from "@/server/validators/tenant-activation.schema";
import { requireLandlordPlatformOperator } from "./auth.service";

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function buildActivationMessage(params: {
  tenantName: string;
  propertyName: string;
  unitName: string;
  activationUrl: string;
}) {
  return [
    `Hello ${params.tenantName},`,
    "",
    `Your tenant account for ${params.unitName} at ${params.propertyName} is ready.`,
    "",
    "Use this secure link to set your password and access your BOPA tenant dashboard:",
    params.activationUrl,
    "",
    "This link expires automatically.",
  ].join("\n");
}

function isPaidFirstRentIntent(metadata: Record<string, unknown>) {
  return (
    metadata.payment_purpose === "new_tenant_first_rent" ||
    metadata.automatic_after_agreement === true
  );
}

async function assertFirstRentPaymentCompleted(tenantId: string) {
  const supabase = createSupabaseAdminClient();
  const intents = await getGatewayPaymentIntentsForTenant(supabase, tenantId);

  const hasPaidFirstRent = intents.some((intent) => {
    if (intent.status !== "paid") {
      return false;
    }

    return isPaidFirstRentIntent(intent.metadata);
  });

  if (!hasPaidFirstRent) {
    throw new AppError(
      "FIRST_RENT_PAYMENT_REQUIRED",
      "Tenant account activation is available after the first rent payment is confirmed.",
      400,
    );
  }
}

export async function generateTenantActivationLink(tenantId: string) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to activate this tenant.",
      403,
    );
  }

  if (tenant.onboarding_status !== "approved") {
    throw new AppError(
      "TENANT_NOT_APPROVED",
      "Approve this tenant before sending account activation.",
      400,
    );
  }

  if (tenant.profile_id) {
    throw new AppError(
      "TENANT_ALREADY_ACTIVATED",
      "This tenant already has an account.",
      400,
    );
  }

  await assertFirstRentPaymentCompleted(tenantId);

  const tenantPhone = normalisePhoneNumber(tenant.phone_number);
  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = getExpiryDateFromNow(72);

  await saveTenantActivationToken(supabase, {
    landlordId: landlord.id,
    tenantId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  const activationUrl = `${getAppBaseUrl()}/t/activate/${rawToken}`;
  const propertyName =
    tenant.units?.properties?.property_name ?? "your apartment";
  const unitName = tenant.units?.unit_identifier ?? "your unit";

  return {
    activationUrl,
    expiresAt: expiresAt.toISOString(),
    tenantWhatsappNumber: tenantPhone.national,
    whatsappMessage: buildActivationMessage({
      tenantName: tenant.full_name,
      propertyName,
      unitName,
      activationUrl,
    }),
  };
}

export async function resolveTenantActivationToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const tokenHash = sha256Hex(token);

  const activationToken = await getTenantActivationTokenByHash(
    supabase,
    tokenHash,
  );

  if (!activationToken || !activationToken.tenants) {
    throw new AppError(
      "INVALID_ACTIVATION_LINK",
      "This activation link is invalid. Please ask your landlord for a new link.",
      404,
    );
  }

  if (activationToken.used_at) {
    throw new AppError(
      "ACTIVATION_LINK_USED",
      "This activation link has already been used. Please sign in instead.",
      400,
    );
  }

  const expiresAt = new Date(activationToken.expires_at);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    throw new AppError(
      "ACTIVATION_LINK_EXPIRED",
      "This activation link has expired. Please ask your landlord for a new link.",
      410,
    );
  }

  if (activationToken.tenants.profile_id) {
    throw new AppError(
      "TENANT_ALREADY_ACTIVATED",
      "This tenant account has already been activated. Please sign in.",
      400,
    );
  }

  return activationToken;
}

export async function activateTenantAccount(input: ActivateTenantAccountInput) {
  const activationToken = await resolveTenantActivationToken(input.token);
  const tenant = activationToken.tenants;

  if (!tenant) {
    throw new AppError(
      "TENANT_NOT_FOUND",
      "We could not find this tenant account.",
      404,
    );
  }

  const adminSupabase = createSupabaseAdminClient();
  const userSupabase = await createSupabaseServerClient();
  const normalisedPhone = normalisePhoneNumber(tenant.phone_number);

  const { data, error } = await userSupabase.auth.signUp({
    phone: normalisedPhone.e164,
    password: input.password,
    options: {
      data: {
        full_name: tenant.full_name,
        role: "tenant",
      },
    },
  });

  if (error || !data.user) {
    throw new AppError(
      "TENANT_ACCOUNT_CREATE_FAILED",
      error?.message ?? "Tenant account could not be created.",
      400,
    );
  }

  await upsertProfile(adminSupabase, {
    id: data.user.id,
    role: "tenant",
    fullName: tenant.full_name,
    phoneNumber: normalisedPhone.e164,
    email: tenant.email,
  });

  await linkTenantToProfile(adminSupabase, {
    tenantId: tenant.id,
    profileId: data.user.id,
  });

  await markTenantActivationTokenUsed(adminSupabase, activationToken.id);

  await writeAuditLog({
    landlordId: tenant.landlord_id,
    tenantId: tenant.id,
    unitId: tenant.units?.id ?? null,
    propertyId: tenant.units?.properties?.id ?? null,
    actorProfileId: data.user.id,
    actorRole: AUDIT_ACTOR_ROLES.tenant,
    eventType: AUDIT_EVENT_TYPES.tenantAccountActivated,
    entityType: AUDIT_ENTITY_TYPES.activation,
    entityId: activationToken.id,
    description: `${tenant.full_name} activated their tenant account.`,
    metadata: {
      tenant_name: tenant.full_name,
      tenant_profile_id: data.user.id,
      activation_token_id: activationToken.id,
      activated_at: new Date().toISOString(),
    },
  });

  return {
    tenantId: tenant.id,
  };
}

export async function generateTenantActivationLinkSystem(tenantId: string) {
  const supabase = createSupabaseAdminClient();
  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.onboarding_status !== "approved") {
    throw new AppError(
      "TENANT_NOT_APPROVED",
      "Approve this tenant before preparing account activation.",
      400,
    );
  }

  if (tenant.profile_id) {
    return null;
  }

  await assertFirstRentPaymentCompleted(tenantId);

  const tenantPhone = normalisePhoneNumber(tenant.phone_number);
  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = getExpiryDateFromNow(72);

  await saveTenantActivationToken(supabase, {
    landlordId: tenant.landlord_id,
    tenantId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  const activationUrl = `${getAppBaseUrl()}/t/activate/${rawToken}`;
  const propertyName =
    tenant.units?.properties?.property_name ?? "your apartment";
  const unitName = tenant.units?.unit_identifier ?? "your unit";

  return {
    activationUrl,
    expiresAt: expiresAt.toISOString(),
    tenantWhatsappNumber: tenantPhone.national,
    whatsappMessage: buildActivationMessage({
      tenantName: tenant.full_name,
      propertyName,
      unitName,
      activationUrl,
    }),
  };
}
