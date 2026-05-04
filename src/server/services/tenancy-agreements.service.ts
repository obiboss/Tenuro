import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getAppBaseUrl } from "@/server/constants/routes";
import {
  acceptTenancyAgreement,
  createTenancyAgreementDraft,
  finalizeTenancyAgreement,
  getTenancyAgreementByAcceptanceTokenHash,
  getTenancyAgreementById,
  getTenancyAgreementByTenancyId,
  refreshAgreementAcceptanceToken,
  updateTenancyAgreementDraft,
  type TenancyAgreementDocumentRow,
} from "@/server/repositories/tenancy-agreements.repository";
import { getTenancyById } from "@/server/repositories/tenancies.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { sha256Hex } from "@/server/utils/crypto";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  generateSecureToken,
  getExpiryDateFromNow,
} from "@/server/utils/tokens";
import { generateAndStoreTenancyAgreementPdf } from "@/server/services/tenancy-agreement-pdf.service";
import { createSignedTenancyAgreementPdfUrl } from "@/server/services/storage.service";
import type {
  AcceptTenancyAgreementInput,
  FinalizeTenancyAgreementInput,
  GenerateTenancyAgreementInput,
  GenerateTenancyAgreementPdfInput,
  RefreshTenancyAgreementAcceptanceLinkInput,
  SaveTenancyAgreementDraftInput,
} from "@/server/validators/tenancy-agreement.schema";
import { requireLandlord } from "./auth.service";
import { buildTenancyAgreementTemplate } from "./tenancy-agreement-template.service";

function getSnapshotTextValue(
  snapshot: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = snapshot[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function buildAgreementWhatsAppMessage(params: {
  tenantName: string;
  landlordName: string;
  propertyName: string;
  unitName: string;
  acceptanceUrl: string;
}) {
  return [
    `Hello ${params.tenantName},`,
    "",
    `${params.landlordName} has prepared your tenancy agreement for ${params.unitName} at ${params.propertyName}.`,
    "",
    "Please open this secure link to review and accept the agreement:",
    params.acceptanceUrl,
    "",
    "After acceptance, your rent payment link can be sent to you.",
  ].join("\n");
}

function buildAgreementDeliveryDetails(params: {
  landlordName: string;
  agreement: TenancyAgreementDocumentRow;
  acceptanceUrl: string;
}) {
  const tenantName = getSnapshotTextValue(
    params.agreement.tenant_snapshot,
    "fullName",
    "Tenant",
  );

  const tenantPhoneNumber = getSnapshotTextValue(
    params.agreement.tenant_snapshot,
    "phoneNumber",
    "",
  );

  const propertyName = getSnapshotTextValue(
    params.agreement.property_snapshot,
    "propertyName",
    "your apartment",
  );

  const unitName = getSnapshotTextValue(
    params.agreement.property_snapshot,
    "unitIdentifier",
    "your unit",
  );

  const tenantPhone = normalisePhoneNumber(tenantPhoneNumber);

  return {
    tenantWhatsappNumber: tenantPhone.national,
    whatsappMessage: buildAgreementWhatsAppMessage({
      tenantName,
      landlordName: params.landlordName,
      propertyName,
      unitName,
      acceptanceUrl: params.acceptanceUrl,
    }),
  };
}

function buildAgreementUrl(token: string) {
  return `${getAppBaseUrl()}/t/agreement/${token}`;
}

function createAcceptanceToken() {
  const rawToken = generateSecureToken();

  return {
    rawToken,
    tokenHash: sha256Hex(rawToken),
    expiresAt: getExpiryDateFromNow(168),
    acceptanceUrl: buildAgreementUrl(rawToken),
  };
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

  if (agreement.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to edit this agreement.",
      403,
    );
  }

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

  if (agreement.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to finalize this agreement.",
      403,
    );
  }

  if (agreement.document_status !== "draft") {
    throw new AppError(
      "AGREEMENT_NOT_DRAFT",
      "Only a draft agreement can be finalized.",
      400,
    );
  }

  const token = createAcceptanceToken();

  const updatedAgreement = await finalizeTenancyAgreement(supabase, {
    agreementId: input.agreementId,
    finalizedBy: landlord.id,
    tokenHash: token.tokenHash,
    tokenExpiresAt: token.expiresAt.toISOString(),
  });

  const deliveryDetails = buildAgreementDeliveryDetails({
    landlordName: landlord.fullName,
    agreement: updatedAgreement,
    acceptanceUrl: token.acceptanceUrl,
  });

  return {
    agreement: updatedAgreement,
    acceptanceUrl: token.acceptanceUrl,
    ...deliveryDetails,
  };
}

export async function refreshTenancyAgreementAcceptanceLinkForCurrentLandlord(
  input: RefreshTenancyAgreementAcceptanceLinkInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const agreement = await getTenancyAgreementById(supabase, input.agreementId);

  if (agreement.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to create this agreement link.",
      403,
    );
  }

  if (
    agreement.document_status !== "sent_to_tenant" &&
    agreement.document_status !== "finalized"
  ) {
    throw new AppError(
      "AGREEMENT_LINK_NOT_AVAILABLE",
      "Finalize the agreement before creating the tenant acceptance link.",
      400,
    );
  }

  const token = createAcceptanceToken();

  const updatedAgreement = await refreshAgreementAcceptanceToken(supabase, {
    agreementId: input.agreementId,
    tokenHash: token.tokenHash,
    tokenExpiresAt: token.expiresAt.toISOString(),
  });

  const deliveryDetails = buildAgreementDeliveryDetails({
    landlordName: landlord.fullName,
    agreement: updatedAgreement,
    acceptanceUrl: token.acceptanceUrl,
  });

  return {
    agreement: updatedAgreement,
    acceptanceUrl: token.acceptanceUrl,
    ...deliveryDetails,
  };
}

export async function resolveTenancyAgreementAcceptanceToken(token: string) {
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

  return agreement;
}

export async function acceptTenancyAgreementFromTenant(
  input: AcceptTenancyAgreementInput & {
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const agreement = await resolveTenancyAgreementAcceptanceToken(input.token);

  if (agreement.document_status === "accepted") {
    const pdfDownloadUrl = await createSignedTenancyAgreementPdfUrl(
      agreement.pdf_path,
    );

    return {
      agreement,
      pdfDownloadUrl,
    };
  }

  if (agreement.document_status !== "sent_to_tenant") {
    throw new AppError(
      "AGREEMENT_NOT_READY",
      "This agreement is not ready for acceptance.",
      400,
    );
  }

  const supabase = createSupabaseAdminClient();

  const acceptedAgreement = await acceptTenancyAgreement(supabase, {
    agreementId: agreement.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const agreementWithPdf = await generateAndStoreTenancyAgreementPdf(
    supabase,
    acceptedAgreement,
  );

  const pdfDownloadUrl = await createSignedTenancyAgreementPdfUrl(
    agreementWithPdf.pdf_path,
  );

  return {
    agreement: agreementWithPdf,
    pdfDownloadUrl,
  };
}

export async function generateTenancyAgreementPdfForCurrentLandlord(
  input: GenerateTenancyAgreementPdfInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const agreement = await getTenancyAgreementById(supabase, input.agreementId);

  if (agreement.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to generate this PDF.",
      403,
    );
  }

  const agreementWithPdf = await generateAndStoreTenancyAgreementPdf(
    supabase,
    agreement,
  );

  const pdfDownloadUrl = await createSignedTenancyAgreementPdfUrl(
    agreementWithPdf.pdf_path,
  );

  return {
    agreement: agreementWithPdf,
    pdfDownloadUrl,
  };
}

export async function getCurrentTenancyAgreementPdfDownloadUrl(
  agreementId: string,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const agreement = await getTenancyAgreementById(supabase, agreementId);

  if (agreement.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to download this agreement PDF.",
      403,
    );
  }

  return createSignedTenancyAgreementPdfUrl(agreement.pdf_path);
}

export async function getTenantAgreementPdfDownloadUrlFromToken(token: string) {
  const agreement = await resolveTenancyAgreementAcceptanceToken(token);

  if (agreement.document_status !== "accepted") {
    return null;
  }

  return createSignedTenancyAgreementPdfUrl(agreement.pdf_path);
}
