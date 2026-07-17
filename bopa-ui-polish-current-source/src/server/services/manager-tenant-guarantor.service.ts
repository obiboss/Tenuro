import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import { getManagerOrganizationForCurrentUser } from "@/server/repositories/manager.repository";
import {
  cancelManagerTenantGuarantorsForRequest,
  confirmManagerTenantGuarantor,
  createManagerTenantGuarantors,
  deleteManagerTenantGuarantorsForRequest,
  getManagerTenantGuarantorById,
  getManagerTenantGuarantorByTokenHash,
  listManagerTenantGuarantorsForRequest,
  rotateManagerTenantGuarantorToken,
  type ManagerTenantGuarantorRow,
} from "@/server/repositories/manager-tenant-guarantors.repository";
import type {
  ManagerTenantOnboardingRequestRow,
  ManagerTenantRequirementSnapshotItem,
} from "@/server/repositories/manager-tenant-onboarding.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type {
  ConfirmManagerTenantGuarantorInput,
  ManagerTenantGuarantorInput,
  ResendManagerTenantGuarantorLinkInput,
} from "@/server/validators/manager-tenant-guarantor.schema";

export type ManagerTenantGuarantorShareLink = {
  guarantorId: string;
  fullName: string;
  phoneNumber: string;
  confirmationUrl: string;
  whatsappMessage: string;
};

export type ManagerTenantGuarantorAgreementSnapshot = {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  relationshipToTenant: string;
  residentialAddress: string;
  occupation: string;
  employerOrBusiness: string | null;
  monthlyIncome: number;
  idType: ManagerTenantGuarantorRow["id_type"];
  idNumber: string;
  confirmedAt: string;
};

function createSecureToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getExpiryDateFromHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BOPA_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!configuredUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return configuredUrl.replace(/\/$/, "");
}

function getGuarantorConfirmationUrl(token: string) {
  return `${getAppBaseUrl()}/m/guarantor/${encodeURIComponent(token)}`;
}

function nullableText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getTenantName(request: ManagerTenantOnboardingRequestRow) {
  return (
    request.tenant_full_name ??
    request.invited_tenant_full_name ??
    "the tenant"
  );
}

function buildGuarantorWhatsAppMessage(params: {
  guarantorName: string;
  tenantName: string;
  organizationName: string;
  propertyName: string;
  unitLabel: string;
  confirmationUrl: string;
}) {
  return [
    `Hello ${params.guarantorName},`,
    "",
    `${params.tenantName} has provided your details as a guarantor for ${params.unitLabel} at ${params.propertyName}, managed by ${params.organizationName}.`,
    "",
    "Please review the information and confirm whether you accept the guarantor responsibility:",
    params.confirmationUrl,
    "",
    "Do not share this private link.",
  ].join("\n");
}

export function getRequiredManagerTenantGuarantorCount(
  requirements: ManagerTenantRequirementSnapshotItem[],
) {
  const requirement = requirements.find(
    (item) =>
      item.requirementCode === "guarantor_required" &&
      item.expectedBoolean === true,
  );

  if (!requirement) {
    return 0;
  }

  const count = Number(requirement.requiredGuarantorCount ?? 1);
  return count === 2 ? 2 : 1;
}

function validateGuarantorInputs(params: {
  requiredCount: number;
  tenantPhoneNumber: string;
  guarantors: ManagerTenantGuarantorInput[];
}) {
  if (params.requiredCount === 0) {
    if (params.guarantors.length > 0) {
      throw new AppError(
        "MANAGER_GUARANTOR_NOT_REQUIRED",
        "Guarantor details are not required for this property.",
        400,
      );
    }

    return [];
  }

  if (params.guarantors.length !== params.requiredCount) {
    throw new AppError(
      "MANAGER_GUARANTOR_DETAILS_REQUIRED",
      `Enter complete details for ${params.requiredCount} guarantor${params.requiredCount === 1 ? "" : "s"}.`,
      400,
    );
  }

  const tenantPhone = normalisePhoneNumber(params.tenantPhoneNumber).e164;
  const usedPhones = new Set<string>();
  const usedEmails = new Set<string>();

  return params.guarantors.map((guarantor) => {
    const phone = normalisePhoneNumber(guarantor.phoneNumber);
    const email = nullableText(guarantor.email)?.toLowerCase() ?? null;

    if (phone.e164 === tenantPhone) {
      throw new AppError(
        "MANAGER_GUARANTOR_TENANT_PHONE_MATCH",
        "A guarantor must use a different phone number from the tenant.",
        400,
      );
    }

    if (usedPhones.has(phone.e164)) {
      throw new AppError(
        "MANAGER_GUARANTOR_PHONE_DUPLICATE",
        "Each guarantor must use a different phone number.",
        400,
      );
    }

    if (email && usedEmails.has(email)) {
      throw new AppError(
        "MANAGER_GUARANTOR_EMAIL_DUPLICATE",
        "Each guarantor must use a different email address.",
        400,
      );
    }

    usedPhones.add(phone.e164);
    if (email) usedEmails.add(email);

    return {
      ...guarantor,
      phone,
      email,
      employerOrBusiness: nullableText(guarantor.employerOrBusiness),
      monthlyIncome: roundMoney(guarantor.monthlyIncome),
    };
  });
}

export async function prepareManagerTenantGuarantors(params: {
  request: ManagerTenantOnboardingRequestRow;
  tenantPhoneNumber: string;
  guarantors: ManagerTenantGuarantorInput[];
}) {
  const requiredCount = getRequiredManagerTenantGuarantorCount(
    params.request.tenant_requirements_snapshot,
  );
  const normalized = validateGuarantorInputs({
    requiredCount,
    tenantPhoneNumber: params.tenantPhoneNumber,
    guarantors: params.guarantors,
  });

  if (normalized.length === 0) {
    return {
      rows: [] as ManagerTenantGuarantorRow[],
      links: [] as ManagerTenantGuarantorShareLink[],
    };
  }

  const tokens = normalized.map(() => createSecureToken());
  const tokenExpiresAt = getExpiryDateFromHours(168);
  const supabase = createSupabaseAdminClient();

  const rows = await createManagerTenantGuarantors(supabase, {
    organizationId: params.request.organization_id,
    landlordClientId: params.request.landlord_client_id,
    propertyId: params.request.property_id,
    unitId: params.request.unit_id,
    onboardingRequestId: params.request.id,
    guarantors: normalized.map((guarantor, index) => ({
      position: index + 1,
      fullName: guarantor.fullName,
      phoneNumber: guarantor.phone.e164,
      email: guarantor.email,
      relationshipToTenant: guarantor.relationshipToTenant,
      residentialAddress: guarantor.residentialAddress,
      occupation: guarantor.occupation,
      employerOrBusiness: guarantor.employerOrBusiness,
      monthlyIncome: guarantor.monthlyIncome,
      idType: guarantor.idType,
      idNumber: guarantor.idNumber,
      tokenHash: hashToken(tokens[index]),
      tokenExpiresAt,
      metadata: {
        source: "bopa_manager_tenant_kyc",
      },
    })),
  });

  const organizationName =
    params.request.manager_organizations?.organization_name ??
    "the property manager";
  const propertyName =
    params.request.manager_properties?.property_name ?? "the property";
  const unitLabel = params.request.manager_units?.unit_label ?? "the unit";
  const tenantName = getTenantName(params.request);

  return {
    rows,
    links: rows.map((row, index) => {
      const confirmationUrl = getGuarantorConfirmationUrl(tokens[index]);
      const phone = normalisePhoneNumber(row.phone_number);

      return {
        guarantorId: row.id,
        fullName: row.full_name,
        phoneNumber: phone.national,
        confirmationUrl,
        whatsappMessage: buildGuarantorWhatsAppMessage({
          guarantorName: row.full_name,
          tenantName,
          organizationName,
          propertyName,
          unitLabel,
          confirmationUrl,
        }),
      };
    }),
  };
}

export async function removePreparedManagerTenantGuarantors(params: {
  organizationId: string;
  requestId: string;
}) {
  await deleteManagerTenantGuarantorsForRequest(
    createSupabaseAdminClient(),
    params,
  );
}

export async function resolveManagerTenantGuarantorToken(token: string) {
  const guarantor = await getManagerTenantGuarantorByTokenHash(
    createSupabaseAdminClient(),
    hashToken(token),
  );

  if (!guarantor || guarantor.status === "cancelled") {
    throw new AppError(
      "MANAGER_GUARANTOR_LINK_NOT_FOUND",
      "This guarantor confirmation link is unavailable.",
      404,
    );
  }

  if (
    guarantor.status === "pending_confirmation" &&
    new Date(guarantor.confirmation_token_expires_at).getTime() < Date.now()
  ) {
    throw new AppError(
      "MANAGER_GUARANTOR_LINK_EXPIRED",
      "This guarantor confirmation link has expired. Ask the tenant or property manager for a new link.",
      410,
    );
  }

  return guarantor;
}

export async function confirmManagerTenantGuarantorByToken(
  input: ConfirmManagerTenantGuarantorInput & {
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const adminSupabase = createSupabaseAdminClient();
  const guarantor = await resolveManagerTenantGuarantorToken(input.token);

  if (guarantor.status === "confirmed") {
    return guarantor;
  }

  if (guarantor.status !== "pending_confirmation") {
    throw new AppError(
      "MANAGER_GUARANTOR_LINK_UNAVAILABLE",
      "This guarantor confirmation is no longer available.",
      400,
    );
  }

  const request = guarantor.manager_tenant_onboarding_requests;
  if (!request || request.status !== "submitted") {
    throw new AppError(
      "MANAGER_GUARANTOR_REQUEST_UNAVAILABLE",
      "This tenant application is no longer awaiting guarantor confirmation.",
      400,
    );
  }

  const phone = normalisePhoneNumber(input.phoneNumber);
  const tenantPhoneRaw =
    request.tenant_phone_number ??
    request.invited_tenant_phone_number;

  if (tenantPhoneRaw) {
    const tenantPhone = normalisePhoneNumber(tenantPhoneRaw);

    if (tenantPhone.e164 === phone.e164) {
      throw new AppError(
        "MANAGER_GUARANTOR_TENANT_PHONE_MATCH",
        "A guarantor must use a different phone number from the tenant.",
        400,
      );
    }
  }

  const requestGuarantors = await listManagerTenantGuarantorsForRequest(
    adminSupabase,
    {
      organizationId: guarantor.organization_id,
      requestId: guarantor.onboarding_request_id,
    },
  );

  if (
    requestGuarantors.some(
      (other) =>
        other.id !== guarantor.id &&
        other.phone_number === phone.e164,
    )
  ) {
    throw new AppError(
      "MANAGER_GUARANTOR_PHONE_DUPLICATE",
      "This phone number is already used by another guarantor.",
      400,
    );
  }

  const normalizedEmail = nullableText(input.email)?.toLowerCase() ?? null;

  if (
    normalizedEmail &&
    requestGuarantors.some(
      (other) =>
        other.id !== guarantor.id &&
        other.email?.toLowerCase() === normalizedEmail,
    )
  ) {
    throw new AppError(
      "MANAGER_GUARANTOR_EMAIL_DUPLICATE",
      "This email address is already used by another guarantor.",
      400,
    );
  }

  return confirmManagerTenantGuarantor(adminSupabase, {
    guarantorId: guarantor.id,
    fullName: input.fullName,
    phoneNumber: phone.e164,
    email: normalizedEmail,
    relationshipToTenant: input.relationshipToTenant,
    residentialAddress: input.residentialAddress,
    occupation: input.occupation,
    employerOrBusiness: nullableText(input.employerOrBusiness),
    monthlyIncome: roundMoney(input.monthlyIncome),
    idType: input.idType,
    idNumber: input.idNumber,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

async function requireManagerOrganization() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization || organization.status !== "active") {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Your manager workspace could not be found.",
      403,
    );
  }

  return { manager, supabase, organization };
}

export async function resendManagerTenantGuarantorLinkForCurrentManager(
  input: ResendManagerTenantGuarantorLinkInput,
) {
  const { organization } = await requireManagerOrganization();
  const adminSupabase = createSupabaseAdminClient();
  const guarantor = await getManagerTenantGuarantorById(adminSupabase, {
    organizationId: organization.id,
    guarantorId: input.guarantorId,
  });

  if (guarantor.status !== "pending_confirmation") {
    throw new AppError(
      "MANAGER_GUARANTOR_ALREADY_CONFIRMED",
      "This guarantor no longer needs a confirmation link.",
      400,
    );
  }

  const rawToken = createSecureToken();
  const updated = await rotateManagerTenantGuarantorToken(adminSupabase, {
    organizationId: organization.id,
    guarantorId: guarantor.id,
    tokenHash: hashToken(rawToken),
    tokenExpiresAt: getExpiryDateFromHours(168),
  });
  const confirmationUrl = getGuarantorConfirmationUrl(rawToken);
  const tenantName =
    updated.manager_tenant_onboarding_requests?.tenant_full_name ??
    updated.manager_tenant_onboarding_requests?.invited_tenant_full_name ??
    "the tenant";
  const propertyName =
    updated.manager_properties?.property_name ?? "the property";
  const unitLabel = updated.manager_units?.unit_label ?? "the unit";
  const phone = normalisePhoneNumber(updated.phone_number);

  return {
    guarantorId: updated.id,
    fullName: updated.full_name,
    phoneNumber: phone.national,
    confirmationUrl,
    whatsappMessage: buildGuarantorWhatsAppMessage({
      guarantorName: updated.full_name,
      tenantName,
      organizationName: organization.organization_name,
      propertyName,
      unitLabel,
      confirmationUrl,
    }),
  } satisfies ManagerTenantGuarantorShareLink;
}

export async function assertRequiredManagerTenantGuarantorsConfirmed(params: {
  organizationId: string;
  request: ManagerTenantOnboardingRequestRow;
}) {
  const requiredCount = getRequiredManagerTenantGuarantorCount(
    params.request.tenant_requirements_snapshot,
  );

  if (requiredCount === 0) {
    return [] as ManagerTenantGuarantorAgreementSnapshot[];
  }

  const guarantors = await listManagerTenantGuarantorsForRequest(
    createSupabaseAdminClient(),
    {
      organizationId: params.organizationId,
      requestId: params.request.id,
    },
  );
  const confirmed = guarantors.filter(
    (guarantor) => guarantor.status === "confirmed",
  );

  if (
    guarantors.length !== requiredCount ||
    confirmed.length !== requiredCount
  ) {
    throw new AppError(
      "MANAGER_GUARANTOR_CONFIRMATION_PENDING",
      `Wait for ${requiredCount} guarantor${requiredCount === 1 ? "" : "s"} to confirm before approving this tenant.`,
      400,
    );
  }

  return confirmed
    .sort((first, second) => first.position - second.position)
    .map((guarantor) => ({
      id: guarantor.id,
      fullName: guarantor.full_name,
      phoneNumber: guarantor.phone_number,
      email: guarantor.email,
      relationshipToTenant: guarantor.relationship_to_tenant,
      residentialAddress: guarantor.residential_address,
      occupation: guarantor.occupation,
      employerOrBusiness: guarantor.employer_or_business,
      monthlyIncome: Number(guarantor.monthly_income),
      idType: guarantor.id_type,
      idNumber: guarantor.id_number,
      confirmedAt: guarantor.confirmed_at ?? guarantor.updated_at,
    }));
}

export async function cancelPendingManagerTenantGuarantors(params: {
  organizationId: string;
  requestId: string;
}) {
  await cancelManagerTenantGuarantorsForRequest(
    createSupabaseAdminClient(),
    params,
  );
}
