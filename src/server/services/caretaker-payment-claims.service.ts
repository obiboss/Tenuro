import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createCaretakerPaymentClaim,
  getCaretakerPaymentClaimByTokenHash,
  getCaretakerPaymentClaimContext,
  getSubmittedCaretakerPaymentClaimForLandlord,
  listSubmittedCaretakerPaymentClaimsForCaretaker,
  listSubmittedCaretakerPaymentClaimsForLandlord,
  markCaretakerPaymentClaimConfirmed,
  markCaretakerPaymentClaimRejected,
  submitTenantPaymentProofClaim,
  type CaretakerPaymentClaimRow,
} from "@/server/repositories/caretaker-payment-claims.repository";
import { recordManualRentPaymentViaRpc } from "@/server/repositories/payments.repository";
import { getAppBaseUrl } from "@/server/constants/routes";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { sha256Hex } from "@/server/utils/crypto";
import {
  generateSecureToken,
  getExpiryDateFromNow,
} from "@/server/utils/tokens";
import type {
  ConfirmCaretakerPaymentClaimInput,
  CreateCaretakerProofRequestInput,
  RejectCaretakerPaymentClaimInput,
  ReportCaretakerPaymentInput,
  SubmitTenantPaymentProofInput,
} from "@/server/validators/caretaker-payment-claims.schema";
import {
  requireCaretaker,
  requireLandlordPlatformOperator,
} from "./auth.service";

const PAYMENT_PROOF_EXPIRY_HOURS = 24 * 7;
const PAYMENT_PROOF_BUCKET = "tenant-payment-proofs";

export type CaretakerPaymentClaimView = {
  id: string;
  tenantName: string;
  tenantPhone: string | null;
  propertyName: string;
  unitIdentifier: string;
  propertyUnitLabel: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string | null;
  notes: string | null;
  proofUrl: string | null;
  claimSource: "tenant_proof" | "caretaker_report";
  sourceLabel: string;
  submittedAt: string | null;
  caretakerName: string | null;
};

function getPropertyUnitLabel(params: {
  propertyName?: string | null;
  unitIdentifier?: string | null;
}) {
  const propertyName = params.propertyName || "Property";
  const unitIdentifier = params.unitIdentifier || "Unit";

  return `${propertyName} · ${unitIdentifier}`;
}

function assertTenancyCanReceivePaymentClaim(params: {
  tenancyStatus: string;
  agreementLiveAt: string | null;
}) {
  if (params.tenancyStatus !== "active" || params.agreementLiveAt === null) {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Payment proof can only be handled for an active rental agreement.",
      400,
    );
  }
}

function assertClaimIsUsableForProofSubmission(
  claim: CaretakerPaymentClaimRow,
) {
  if (claim.status !== "draft") {
    throw new AppError(
      "PAYMENT_PROOF_ALREADY_SUBMITTED",
      "This payment proof link has already been used.",
      400,
    );
  }

  if (!claim.token_expires_at) {
    throw new AppError(
      "PAYMENT_PROOF_INVALID",
      "This payment proof link is invalid.",
      400,
    );
  }

  const expiresAt = new Date(claim.token_expires_at);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    throw new AppError(
      "PAYMENT_PROOF_EXPIRED",
      "This payment proof link has expired. Ask the caretaker for a new link.",
      410,
    );
  }
}

function buildTenantProofMessage(params: {
  tenantName: string;
  propertyUnitLabel: string;
  proofUrl: string;
}) {
  return [
    `Good day ${params.tenantName}.`,
    `Please submit proof of your rent payment for ${params.propertyUnitLabel}.`,
    `Use this secure BOPA link: ${params.proofUrl}`,
  ].join(" ");
}

function getSafeExtension(fileName: string) {
  return (
    fileName
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin"
  );
}

async function uploadPaymentProofFile(params: {
  claimId: string;
  file: File | null;
  required?: boolean;
}) {
  if (!params.file || params.file.size === 0) {
    if (params.required) {
      throw new AppError(
        "PAYMENT_PROOF_REQUIRED",
        "Upload payment proof before submitting.",
        400,
      );
    }

    return {
      proofPath: null,
      proofOriginalFilename: null,
    };
  }

  if (params.file.size > 5 * 1024 * 1024) {
    throw new AppError(
      "PAYMENT_PROOF_TOO_LARGE",
      "Proof upload must be 5MB or smaller.",
      400,
    );
  }

  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

  if (!allowedTypes.has(params.file.type)) {
    throw new AppError(
      "PAYMENT_PROOF_UNSUPPORTED",
      "Upload a JPG, PNG, WEBP, or PDF proof.",
      400,
    );
  }

  const storagePath = `${params.claimId}/${Date.now()}.${getSafeExtension(
    params.file.name,
  )}`;

  const adminSupabase = createSupabaseAdminClient();
  const buffer = Buffer.from(await params.file.arrayBuffer());

  const { error } = await adminSupabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(storagePath, buffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    throw new AppError(
      "PAYMENT_PROOF_UPLOAD_FAILED",
      error.message || "Payment proof could not be uploaded.",
      400,
    );
  }

  return {
    proofPath: storagePath,
    proofOriginalFilename: params.file.name,
  };
}

export async function createCaretakerProofRequestForCurrentCaretaker(
  input: CreateCaretakerProofRequestInput,
) {
  const caretaker = await requireCaretaker();
  const supabase = await createSupabaseServerClient();

  const context = await getCaretakerPaymentClaimContext(
    supabase,
    input.tenancyId,
  );

  assertTenancyCanReceivePaymentClaim({
    tenancyStatus: context.tenancy_status,
    agreementLiveAt: context.agreement_live_at,
  });

  const propertyId = context.units?.properties?.id;

  if (!propertyId) {
    throw new AppError(
      "PROPERTY_NOT_FOUND",
      "This tenancy is not linked to a property.",
      400,
    );
  }

  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = getExpiryDateFromNow(PAYMENT_PROOF_EXPIRY_HOURS);
  const adminSupabase = createSupabaseAdminClient();

  await createCaretakerPaymentClaim(adminSupabase, {
    landlordId: context.landlord_id,
    caretakerProfileId: caretaker.id,
    tenancyId: context.id,
    tenantId: context.tenant_id,
    propertyId,
    unitId: context.unit_id,
    claimSource: "tenant_proof",
    status: "draft",
    tokenHash,
    tokenExpiresAt: expiresAt.toISOString(),
    requestedByProfileId: caretaker.id,
    requestedAt: new Date().toISOString(),
  });

  const proofUrl = `${getAppBaseUrl()}/payment-proof/${rawToken}`;
  const propertyUnitLabel = getPropertyUnitLabel({
    propertyName: context.units?.properties?.property_name,
    unitIdentifier: context.units?.unit_identifier,
  });
  const tenantName = context.tenants?.full_name ?? "Tenant";

  return {
    tenantName,
    tenantPhone: context.tenants?.phone_number ?? null,
    propertyUnitLabel,
    proofUrl,
    whatsappMessage: buildTenantProofMessage({
      tenantName,
      propertyUnitLabel,
      proofUrl,
    }),
  };
}

export async function createLandlordProofRequestForCurrentLandlord(
  input: CreateCaretakerProofRequestInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const context = await getCaretakerPaymentClaimContext(
    supabase,
    input.tenancyId,
  );

  if (context.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to request payment proof for this tenancy.",
      403,
    );
  }

  assertTenancyCanReceivePaymentClaim({
    tenancyStatus: context.tenancy_status,
    agreementLiveAt: context.agreement_live_at,
  });

  const propertyId = context.units?.properties?.id;

  if (!propertyId) {
    throw new AppError(
      "PROPERTY_NOT_FOUND",
      "This tenancy is not linked to a property.",
      400,
    );
  }

  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = getExpiryDateFromNow(PAYMENT_PROOF_EXPIRY_HOURS);
  const adminSupabase = createSupabaseAdminClient();

  await createCaretakerPaymentClaim(adminSupabase, {
    landlordId: landlord.id,
    caretakerProfileId: null,
    tenancyId: context.id,
    tenantId: context.tenant_id,
    propertyId,
    unitId: context.unit_id,
    claimSource: "tenant_proof",
    status: "draft",
    tokenHash,
    tokenExpiresAt: expiresAt.toISOString(),
    requestedByProfileId: landlord.id,
    requestedAt: new Date().toISOString(),
  });

  const proofUrl = `${getAppBaseUrl()}/payment-proof/${rawToken}`;
  const propertyUnitLabel = getPropertyUnitLabel({
    propertyName: context.units?.properties?.property_name,
    unitIdentifier: context.units?.unit_identifier,
  });
  const tenantName = context.tenants?.full_name ?? "Tenant";

  return {
    tenantName,
    tenantPhone: context.tenants?.phone_number ?? null,
    propertyUnitLabel,
    proofUrl,
    whatsappMessage: buildTenantProofMessage({
      tenantName,
      propertyUnitLabel,
      proofUrl,
    }),
  };
}

export async function getCaretakerProofRequestPageContext(tenancyId: string) {
  const caretaker = await requireCaretaker();
  const supabase = await createSupabaseServerClient();
  const context = await getCaretakerPaymentClaimContext(supabase, tenancyId);

  assertTenancyCanReceivePaymentClaim({
    tenancyStatus: context.tenancy_status,
    agreementLiveAt: context.agreement_live_at,
  });

  return {
    caretakerName: caretaker.fullName,
    tenancyId: context.id,
    tenantName: context.tenants?.full_name ?? "Tenant",
    tenantPhone: context.tenants?.phone_number ?? null,
    propertyUnitLabel: getPropertyUnitLabel({
      propertyName: context.units?.properties?.property_name,
      unitIdentifier: context.units?.unit_identifier,
    }),
    rentAmount: Number(context.rent_amount),
  };
}

export async function getCaretakerReportPaymentPageContext(tenancyId: string) {
  const caretaker = await requireCaretaker();
  const supabase = await createSupabaseServerClient();
  const context = await getCaretakerPaymentClaimContext(supabase, tenancyId);

  assertTenancyCanReceivePaymentClaim({
    tenancyStatus: context.tenancy_status,
    agreementLiveAt: context.agreement_live_at,
  });

  return {
    caretakerName: caretaker.fullName,
    tenancyId: context.id,
    tenantName: context.tenants?.full_name ?? "Tenant",
    tenantPhone: context.tenants?.phone_number ?? null,
    propertyUnitLabel: getPropertyUnitLabel({
      propertyName: context.units?.properties?.property_name,
      unitIdentifier: context.units?.unit_identifier,
    }),
    rentAmount: Number(context.rent_amount),
  };
}

export async function reportCaretakerPaymentForCurrentCaretaker(
  input: ReportCaretakerPaymentInput,
  proofFile: File | null,
) {
  const caretaker = await requireCaretaker();
  const supabase = await createSupabaseServerClient();

  const context = await getCaretakerPaymentClaimContext(
    supabase,
    input.tenancyId,
  );

  assertTenancyCanReceivePaymentClaim({
    tenancyStatus: context.tenancy_status,
    agreementLiveAt: context.agreement_live_at,
  });

  const propertyId = context.units?.properties?.id;

  if (!propertyId) {
    throw new AppError(
      "PROPERTY_NOT_FOUND",
      "This tenancy is not linked to a property.",
      400,
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  const claim = await createCaretakerPaymentClaim(adminSupabase, {
    landlordId: context.landlord_id,
    caretakerProfileId: caretaker.id,
    tenancyId: context.id,
    tenantId: context.tenant_id,
    propertyId,
    unitId: context.unit_id,
    claimSource: "caretaker_report",
    status: "draft",
    requestedByProfileId: caretaker.id,
    requestedAt: new Date().toISOString(),
  });

  const upload = await uploadPaymentProofFile({
    claimId: claim.id,
    file: proofFile,
    required: false,
  });

  const submitted = await submitTenantPaymentProofClaim(adminSupabase, {
    claimId: claim.id,
    amountPaid: input.amountPaid,
    paymentDate: input.paymentDate.toISOString().slice(0, 10),
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference || null,
    proofPath: upload.proofPath,
    proofOriginalFilename: upload.proofOriginalFilename,
    notes: input.notes || null,
  });

  if (!submitted) {
    throw new AppError(
      "PAYMENT_REPORT_FAILED",
      "Payment report could not be submitted.",
      400,
    );
  }

  return submitted;
}

export async function getTenantPaymentProofContext(token: string) {
  const adminSupabase = createSupabaseAdminClient();
  const claim = await getCaretakerPaymentClaimByTokenHash(
    adminSupabase,
    sha256Hex(token),
  );

  if (!claim) {
    throw new AppError(
      "PAYMENT_PROOF_INVALID",
      "This payment proof link is invalid.",
      404,
    );
  }

  assertClaimIsUsableForProofSubmission(claim);

  return {
    token,
    tenantName: claim.tenants?.full_name ?? "Tenant",
    propertyUnitLabel: getPropertyUnitLabel({
      propertyName: claim.tenancies?.units?.properties?.property_name,
      unitIdentifier: claim.tenancies?.units?.unit_identifier,
    }),
    landlordName: claim.landlord?.full_name ?? "Landlord",
  };
}

export async function submitTenantPaymentProof(
  input: SubmitTenantPaymentProofInput,
  proofFile: File | null,
) {
  const adminSupabase = createSupabaseAdminClient();
  const claim = await getCaretakerPaymentClaimByTokenHash(
    adminSupabase,
    sha256Hex(input.token),
  );

  if (!claim) {
    throw new AppError(
      "PAYMENT_PROOF_INVALID",
      "This payment proof link is invalid.",
      404,
    );
  }

  assertClaimIsUsableForProofSubmission(claim);

  const upload = await uploadPaymentProofFile({
    claimId: claim.id,
    file: proofFile,
    required: true,
  });

  const submitted = await submitTenantPaymentProofClaim(adminSupabase, {
    claimId: claim.id,
    amountPaid: input.amountPaid,
    paymentDate: input.paymentDate.toISOString().slice(0, 10),
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference || null,
    proofPath: upload.proofPath,
    proofOriginalFilename: upload.proofOriginalFilename,
    notes: input.notes || null,
  });

  if (!submitted) {
    throw new AppError(
      "PAYMENT_PROOF_ALREADY_SUBMITTED",
      "This payment proof link has already been used.",
      400,
    );
  }

  return submitted;
}

async function getSignedProofUrl(proofPath: string | null) {
  if (!proofPath) {
    return null;
  }

  const adminSupabase = createSupabaseAdminClient();

  const { data, error } = await adminSupabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(proofPath, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

export async function getSubmittedCaretakerPaymentClaimsForCurrentCaretaker() {
  await requireCaretaker();
  const supabase = await createSupabaseServerClient();

  return listSubmittedCaretakerPaymentClaimsForCaretaker(supabase);
}

export async function getSignedProofUrlForCaretakerOverview(
  proofPath: string | null,
) {
  return getSignedProofUrl(proofPath);
}

export async function getCurrentLandlordPendingPaymentClaims(): Promise<
  CaretakerPaymentClaimView[]
> {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const claims = await listSubmittedCaretakerPaymentClaimsForLandlord(
    supabase,
    landlord.id,
  );

  return Promise.all(
    claims.map(async (claim) => ({
      id: claim.id,
      tenantName: claim.tenants?.full_name ?? "Tenant",
      tenantPhone: claim.tenants?.phone_number ?? null,
      propertyName:
        claim.tenancies?.units?.properties?.property_name ?? "Property",
      unitIdentifier: claim.tenancies?.units?.unit_identifier ?? "Unit",
      propertyUnitLabel: getPropertyUnitLabel({
        propertyName: claim.tenancies?.units?.properties?.property_name,
        unitIdentifier: claim.tenancies?.units?.unit_identifier,
      }),
      amountPaid: Number(claim.amount_paid ?? 0),
      paymentDate: claim.payment_date ?? "",
      paymentMethod: claim.payment_method ?? "other",
      paymentReference: claim.payment_reference,
      notes: claim.notes,
      proofUrl: await getSignedProofUrl(claim.proof_path),
      claimSource: claim.claim_source,
      sourceLabel:
        claim.claim_source === "caretaker_report"
          ? "Reported by caretaker"
          : "Submitted by tenant",
      submittedAt: claim.submitted_at,
      caretakerName: claim.caretaker?.full_name ?? null,
    })),
  );
}

export async function confirmCaretakerPaymentClaimForCurrentLandlord(
  input: ConfirmCaretakerPaymentClaimInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  const claim = await getSubmittedCaretakerPaymentClaimForLandlord(supabase, {
    landlordId: landlord.id,
    claimId: input.claimId,
  });

  if (!claim) {
    throw new AppError(
      "PAYMENT_CLAIM_NOT_FOUND",
      "This payment claim is no longer available.",
      404,
    );
  }

  if (!claim.amount_paid || !claim.payment_date || !claim.payment_method) {
    throw new AppError(
      "PAYMENT_CLAIM_INCOMPLETE",
      "This payment claim is missing required payment details.",
      400,
    );
  }

  const paymentId = await recordManualRentPaymentViaRpc(supabase, {
    tenancyId: claim.tenancy_id,
    amountPaid: Number(claim.amount_paid),
    paymentMethod: claim.payment_method,
    paymentReference: claim.payment_reference,
    paymentDate: new Date(claim.payment_date).toISOString(),
    notes: [
      claim.claim_source === "caretaker_report"
        ? "Confirmed caretaker-reported payment."
        : "Confirmed tenant-submitted payment proof.",
      claim.notes || "",
    ]
      .filter(Boolean)
      .join(" "),
    idempotencyKey: `caretaker-claim:${claim.id}`,
  });

  const recordedByRole =
    claim.claim_source === "caretaker_report" ? "caretaker" : "tenant";

  const { error: updatePaymentError } = await adminSupabase
    .from("rent_payments")
    .update({
      verified_by_landlord: true,
      verified_at: new Date().toISOString(),
      recorded_by_role: recordedByRole,
    })
    .eq("id", paymentId);

  if (updatePaymentError) {
    throw updatePaymentError;
  }

  const confirmed = await markCaretakerPaymentClaimConfirmed(adminSupabase, {
    claimId: claim.id,
    landlordId: landlord.id,
    confirmedByProfileId: landlord.id,
    confirmedPaymentId: paymentId,
  });

  if (!confirmed) {
    throw new AppError(
      "PAYMENT_CLAIM_ALREADY_HANDLED",
      "This payment claim has already been handled.",
      400,
    );
  }

  return {
    paymentId,
  };
}

export async function rejectCaretakerPaymentClaimForCurrentLandlord(
  input: RejectCaretakerPaymentClaimInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const adminSupabase = createSupabaseAdminClient();

  const rejected = await markCaretakerPaymentClaimRejected(adminSupabase, {
    claimId: input.claimId,
    landlordId: landlord.id,
    rejectedByProfileId: landlord.id,
    rejectionReason: input.rejectionReason,
  });

  if (!rejected) {
    throw new AppError(
      "PAYMENT_CLAIM_ALREADY_HANDLED",
      "This payment claim has already been handled.",
      400,
    );
  }

  return rejected;
}
