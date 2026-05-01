import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getAppBaseUrl } from "@/server/constants/routes";
import {
  acceptTenancyAgreement,
  createTenancyAgreementDraft,
  finalizeTenancyAgreementDraft,
  getTenancyAgreementByAcceptanceTokenHash,
  getTenancyAgreementById,
  getTenancyAgreementByTenancyId,
  saveAgreementAcceptanceToken,
  updateTenancyAgreementDraft,
} from "@/server/repositories/tenancy-agreements.repository";
import { getTenancyById } from "@/server/repositories/tenancies.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { sha256Hex } from "@/server/utils/crypto";
import {
  generateSecureToken,
  getExpiryDateFromNow,
} from "@/server/utils/tokens";
import type {
  AcceptTenancyAgreementInput,
  FinalizeTenancyAgreementInput,
  GenerateAgreementAcceptanceLinkInput,
  GenerateTenancyAgreementInput,
  SaveTenancyAgreementDraftInput,
} from "@/server/validators/tenancy-agreement.schema";
import { requireLandlord } from "./auth.service";
import { buildTenancyAgreementTemplate } from "./tenancy-agreement-template.service";

function buildAgreementUrl(token: string) {
  return `${getAppBaseUrl()}/t/agreement/${token}`;
}

function buildSnapshots(params: {
  landlord: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
  };
  tenancy: Awaited<ReturnType<typeof getTenancyById>>;
}) {
  const tenant = params.tenancy.tenants;
  const unit = params.tenancy.units;
  const property = unit?.properties;

  return {
    landlordSnapshot: {
      id: params.landlord.id,
      fullName: params.landlord.fullName,
      phoneNumber: params.landlord.phoneNumber,
      email: params.landlord.email,
    },
    tenantSnapshot: {
      id: tenant?.id ?? null,
      fullName: tenant?.full_name ?? null,
      phoneNumber: tenant?.phone_number ?? null,
      email: tenant?.email ?? null,
      homeAddress: tenant?.home_address ?? null,
    },
    propertySnapshot: {
      id: property?.id ?? null,
      propertyName: property?.property_name ?? null,
      address: property?.address ?? null,
      unitId: unit?.id ?? null,
      unitIdentifier: unit?.unit_identifier ?? null,
      buildingName: unit?.building_name ?? null,
      unitType: unit?.unit_type ?? null,
    },
    tenancySnapshot: {
      id: params.tenancy.id,
      tenancyReference: params.tenancy.tenancy_reference,
      rentAmount: params.tenancy.rent_amount,
      paymentFrequency: params.tenancy.payment_frequency,
      currencyCode: params.tenancy.currency_code,
      startDate: params.tenancy.start_date,
      endDate: params.tenancy.end_date,
      renewalNoticeDate: params.tenancy.renewal_notice_date,
      openingBalance: params.tenancy.opening_balance,
      openingBalanceNote: params.tenancy.opening_balance_note,
    },
  };
}

function ensureAgreementBelongsToLandlord(params: {
  landlordId: string;
  agreementLandlordId: string;
}) {
  if (params.landlordId !== params.agreementLandlordId) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to manage this agreement.",
      403,
    );
  }
}

export async function getCurrentTenancyAgreementByTenancyId(tenancyId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyById(supabase, tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this agreement.",
      403,
    );
  }

  return getTenancyAgreementByTenancyId(supabase, tenancyId);
}

export async function generateTenancyAgreementForCurrentLandlord(
  input: GenerateTenancyAgreementInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyById(supabase, input.tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to generate this agreement.",
      403,
    );
  }

  if (tenancy.status !== "active") {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Create an active tenancy record before generating the agreement document.",
      400,
    );
  }

  const existingAgreement = await getTenancyAgreementByTenancyId(
    supabase,
    input.tenancyId,
  );

  if (existingAgreement) {
    return existingAgreement;
  }

  const snapshots = buildSnapshots({
    landlord,
    tenancy,
  });

  const agreementBody = buildTenancyAgreementTemplate({
    landlord,
    tenancy,
  });

  return createTenancyAgreementDraft(supabase, {
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    agreementBody,
    ...snapshots,
  });
}

export async function saveTenancyAgreementDraftForCurrentLandlord(
  input: SaveTenancyAgreementDraftInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const agreement = await getTenancyAgreementById(supabase, input.agreementId);

  ensureAgreementBelongsToLandlord({
    landlordId: landlord.id,
    agreementLandlordId: agreement.landlord_id,
  });

  if (agreement.document_status !== "draft") {
    throw new AppError(
      "AGREEMENT_LOCKED",
      "This agreement can no longer be edited.",
      400,
    );
  }

  return updateTenancyAgreementDraft(supabase, {
    agreementId: input.agreementId,
    agreementBody: input.agreementBody,
  });
}

export async function finalizeTenancyAgreementForCurrentLandlord(
  input: FinalizeTenancyAgreementInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const agreement = await getTenancyAgreementById(supabase, input.agreementId);

  ensureAgreementBelongsToLandlord({
    landlordId: landlord.id,
    agreementLandlordId: agreement.landlord_id,
  });

  if (agreement.document_status !== "draft") {
    throw new AppError(
      "AGREEMENT_LOCKED",
      "Only draft agreements can be finalized.",
      400,
    );
  }

  return finalizeTenancyAgreementDraft(supabase, {
    agreementId: input.agreementId,
    finalizedBy: landlord.id,
  });
}

export async function generateAgreementAcceptanceLinkForCurrentLandlord(
  input: GenerateAgreementAcceptanceLinkInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const agreement = await getTenancyAgreementById(supabase, input.agreementId);

  ensureAgreementBelongsToLandlord({
    landlordId: landlord.id,
    agreementLandlordId: agreement.landlord_id,
  });

  if (
    agreement.document_status !== "finalized" &&
    agreement.document_status !== "sent_to_tenant"
  ) {
    throw new AppError(
      "AGREEMENT_NOT_FINALIZED",
      "Finalize the agreement before generating the tenant acceptance link.",
      400,
    );
  }

  if (!agreement.finalized_body) {
    throw new AppError(
      "AGREEMENT_NOT_FINALIZED",
      "Finalize the agreement before generating the tenant acceptance link.",
      400,
    );
  }

  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = getExpiryDateFromNow(168);

  const updatedAgreement = await saveAgreementAcceptanceToken(supabase, {
    agreementId: agreement.id,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  return {
    agreement: updatedAgreement,
    acceptanceUrl: buildAgreementUrl(rawToken),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function resolveAgreementAcceptanceToken(token: string) {
  const tokenHash = sha256Hex(token);
  const supabase = createSupabaseAdminClient();

  const agreement = await getTenancyAgreementByAcceptanceTokenHash(
    supabase,
    tokenHash,
  );

  if (!agreement) {
    throw new AppError(
      "INVALID_AGREEMENT_LINK",
      "This agreement link is invalid. Please ask the landlord for a new link.",
      404,
    );
  }

  if (!agreement.tenant_acceptance_token_expires_at) {
    throw new AppError(
      "INVALID_AGREEMENT_LINK",
      "This agreement link is invalid. Please ask the landlord for a new link.",
      404,
    );
  }

  const expiresAt = new Date(agreement.tenant_acceptance_token_expires_at);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    throw new AppError(
      "AGREEMENT_LINK_EXPIRED",
      "This agreement link has expired. Please ask the landlord for a new link.",
      410,
    );
  }

  if (
    agreement.document_status !== "sent_to_tenant" &&
    agreement.document_status !== "accepted"
  ) {
    throw new AppError(
      "AGREEMENT_NOT_READY",
      "This agreement is not ready for tenant acceptance.",
      400,
    );
  }

  return agreement;
}

export async function acceptTenancyAgreementByToken(
  input: AcceptTenancyAgreementInput & {
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const agreement = await resolveAgreementAcceptanceToken(input.token);

  if (agreement.document_status === "accepted") {
    return agreement;
  }

  const supabase = createSupabaseAdminClient();

  return acceptTenancyAgreement(supabase, {
    agreementId: agreement.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}
