import { AppError } from "@/server/errors/app-error";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
} from "@/server/constants/notification-types";
import { APP_ROUTES, getAppBaseUrl } from "@/server/constants/routes";
import { createNotification } from "@/server/repositories/notifications.repository";
import {
  getTenantOnboardingContextByTokenHash,
  markTenantOnboardingTokenExpired,
  saveTenantOnboardingToken,
} from "@/server/repositories/onboarding.repository";
import { getTenantById } from "@/server/repositories/tenants.repository";
import { getUnitWithPropertyById } from "@/server/repositories/units.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { sha256Hex } from "@/server/utils/crypto";
import {
  generateSecureToken,
  getExpiryDateFromNow,
} from "@/server/utils/tokens";
import { requireLandlord } from "./auth.service";

function buildTenantOnboardingMessage(params: {
  tenantName: string;
  landlordName: string;
  propertyName: string;
  unitName: string;
  onboardingUrl: string;
}) {
  return `Hello ${params.tenantName}, ${params.landlordName} has invited you to complete your tenant profile for ${params.unitName} at ${params.propertyName}. Please use this secure link to complete your rental record: ${params.onboardingUrl}`;
}

export async function generateTenantOnboardingLink(tenantId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to invite this tenant.",
      403,
    );
  }

  const unit = await getUnitWithPropertyById(supabase, tenant.unit_id);

  if (!unit.properties) {
    throw new AppError(
      "NOT_FOUND",
      "We could not find the property for this tenant.",
      404,
    );
  }

  if (unit.properties.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to invite this tenant.",
      403,
    );
  }

  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = getExpiryDateFromNow(72);
  const appBaseUrl = getAppBaseUrl();

  const onboardingUrl = `${appBaseUrl}${APP_ROUTES.onboarding.tenant}/${rawToken}`;

  await saveTenantOnboardingToken(supabase, {
    tenantId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  const messageBody = buildTenantOnboardingMessage({
    tenantName: tenant.full_name,
    landlordName: landlord.fullName,
    propertyName: unit.properties.property_name,
    unitName: unit.unit_identifier,
    onboardingUrl,
  });

  const notification = await createNotification(supabase, {
    landlordId: landlord.id,
    tenantId,
    channel: NOTIFICATION_CHANNELS.whatsapp,
    notificationType: NOTIFICATION_TYPES.onboardingInvite,
    messageBody,
  });

  return {
    onboardingUrl,
    expiresAt: expiresAt.toISOString(),
    notificationId: notification.id,
    messageBody,
  };
}

export async function resolveTenantOnboardingToken(token: string) {
  const tokenHash = sha256Hex(token);
  const supabase = createSupabaseAdminClient();

  const tenant = await getTenantOnboardingContextByTokenHash(
    supabase,
    tokenHash,
  );

  if (!tenant) {
    throw new AppError(
      "INVALID_ONBOARDING_LINK",
      "This onboarding link is invalid. Please ask the landlord for a new link.",
      404,
    );
  }

  if (!tenant.onboarding_token_expires_at) {
    throw new AppError(
      "INVALID_ONBOARDING_LINK",
      "This onboarding link is invalid. Please ask the landlord for a new link.",
      404,
    );
  }

  const expiresAt = new Date(tenant.onboarding_token_expires_at);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    await markTenantOnboardingTokenExpired(supabase, tenant.id);

    throw new AppError(
      "ONBOARDING_LINK_EXPIRED",
      "This onboarding link has expired. Please ask the landlord for a new link.",
      410,
    );
  }

  if (tenant.onboarding_status === "approved") {
    throw new AppError(
      "TENANT_ALREADY_APPROVED",
      "Your tenant profile has already been approved.",
      400,
    );
  }

  if (tenant.onboarding_status === "rejected") {
    throw new AppError(
      "TENANT_REJECTED",
      "This tenant profile was not approved. Please contact the landlord.",
      400,
    );
  }

  return tenant;
}
