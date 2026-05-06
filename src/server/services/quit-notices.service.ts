import "server-only";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  acknowledgeQuitNotice,
  createQuitNoticeDraft,
  getActiveTenantIntentToVacateForTenancy,
  getQuitNoticeById,
  getQuitNoticesForLandlord,
  getQuitNoticesForTenancy,
  issueQuitNotice,
  withdrawQuitNotice,
  type QuitNoticeDeliveryMethod,
  type QuitNoticeDetailRow,
  type QuitNoticeType,
} from "@/server/repositories/quit-notices.repository";
import {
  getActiveTenantTenancy,
  getTenantDashboardTenantByProfile,
} from "@/server/repositories/tenant-dashboard.repository";
import {
  getTenancyById,
  terminateTenancy,
} from "@/server/repositories/tenancies.repository";
import { markUnitVacant } from "@/server/repositories/units.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { generateAndStoreQuitNoticePdf } from "@/server/services/quit-notice-pdf.service";
import { buildQuitNoticeTemplate } from "@/server/services/quit-notice-template.service";
import { createSignedQuitNoticePdfUrl } from "@/server/services/storage.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { buildWaMeUrl } from "@/server/utils/whatsapp";
import { requireLandlord, requireTenant } from "./auth.service";

export type CreateQuitNoticeDraftInput = {
  tenancyId: string;
  noticeType: QuitNoticeType;
  noticeDate: string;
  vacateByDate: string;
  reason: string;
  landlordNotes?: string | null;
  deliveryMethod?: QuitNoticeDeliveryMethod;
};

export type CreateTenantMoveOutNoticeInput = {
  plannedMoveOutDate: string;
  reason: string;
};

export type IssueQuitNoticeInput = {
  quitNoticeId: string;
};

export type ConfirmTenantMoveOutInput = {
  quitNoticeId: string;
  actualMoveOutDate: string;
  finalNote?: string | null;
};

export type WithdrawQuitNoticeInput = {
  quitNoticeId: string;
  withdrawnReason: string;
};

export type GenerateQuitNoticePdfInput = {
  quitNoticeId: string;
};

export type PreparedQuitNoticeDelivery = {
  quitNotice: QuitNoticeDetailRow;
  pdfDownloadUrl: string | null;
  whatsappMessage: string;
  whatsappUrl: string;
};

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function validateQuitNoticeDates(params: {
  noticeDate: string;
  vacateByDate: string;
}) {
  const noticeDate = parseDateOnly(params.noticeDate);
  const vacateByDate = parseDateOnly(params.vacateByDate);

  if (!noticeDate || !vacateByDate) {
    throw new AppError(
      "INVALID_NOTICE_DATE",
      "Enter valid notice and vacate-by dates.",
      400,
    );
  }

  if (vacateByDate < noticeDate) {
    throw new AppError(
      "VACATE_DATE_BEFORE_NOTICE_DATE",
      "The vacate-by date cannot be before the notice date.",
      400,
    );
  }
}

function validateTenantMoveOutDate(value: string) {
  const moveOutDate = parseDateOnly(value);
  const today = parseDateOnly(toDateOnly(new Date()));

  if (!moveOutDate || !today) {
    throw new AppError(
      "INVALID_MOVE_OUT_DATE",
      "Enter a valid planned move-out date.",
      400,
    );
  }

  if (moveOutDate < today) {
    throw new AppError(
      "MOVE_OUT_DATE_IN_PAST",
      "The planned move-out date cannot be in the past.",
      400,
    );
  }
}

function validateActualMoveOutDate(params: {
  actualMoveOutDate: string;
  tenancyStartDate: string | null;
}) {
  const actualMoveOutDate = parseDateOnly(params.actualMoveOutDate);

  if (!actualMoveOutDate) {
    throw new AppError(
      "INVALID_ACTUAL_MOVE_OUT_DATE",
      "Enter a valid actual move-out date.",
      400,
    );
  }

  if (params.tenancyStartDate) {
    const tenancyStartDate = parseDateOnly(params.tenancyStartDate);

    if (tenancyStartDate && actualMoveOutDate < tenancyStartDate) {
      throw new AppError(
        "MOVE_OUT_BEFORE_TENANCY_START",
        "Move-out date cannot be before the tenancy start date.",
        400,
      );
    }
  }
}

function assertTextLength(params: {
  value: string;
  code: string;
  message: string;
  minLength: number;
}) {
  if (params.value.trim().length < params.minLength) {
    throw new AppError(params.code, params.message, 400);
  }
}

function buildQuitNoticeWhatsAppMessage(params: {
  quitNotice: QuitNoticeDetailRow;
  pdfDownloadUrl: string | null;
}) {
  const tenantName = params.quitNotice.tenants?.full_name ?? "Tenant";
  const propertyName =
    params.quitNotice.units?.properties?.property_name ?? "the property";
  const unitIdentifier =
    params.quitNotice.units?.unit_identifier ?? "your unit";
  const noticeType =
    params.quitNotice.notice_type === "tenant_intent_to_vacate"
      ? "move-out notice"
      : "quit notice";

  return [
    `Hello ${tenantName},`,
    "",
    `A ${noticeType} has been prepared for ${unitIdentifier} at ${propertyName}.`,
    "",
    `Notice date: ${formatDate(params.quitNotice.notice_date)}`,
    `Vacate-by date: ${formatDate(params.quitNotice.vacate_by_date)}`,
    "",
    "Reason:",
    params.quitNotice.reason,
    "",
    params.pdfDownloadUrl
      ? `Download notice document: ${params.pdfDownloadUrl}`
      : "The notice document is being prepared.",
    "",
    "Please review this notice and contact your landlord if you need clarification.",
  ].join("\n");
}

export async function createQuitNoticeDraftForCurrentLandlord(
  input: CreateQuitNoticeDraftInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  validateQuitNoticeDates({
    noticeDate: input.noticeDate,
    vacateByDate: input.vacateByDate,
  });

  assertTextLength({
    value: input.reason,
    code: "QUIT_NOTICE_REASON_REQUIRED",
    message: "Enter a clear reason for the quit notice.",
    minLength: 5,
  });

  const tenancy = await getTenancyById(supabase, input.tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to create a quit notice for this tenancy.",
      403,
    );
  }

  if (tenancy.status !== "active") {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Quit notice can only be prepared for an active tenancy.",
      400,
    );
  }

  if (!tenancy.tenants) {
    throw new AppError(
      "TENANT_NOT_FOUND",
      "This tenancy does not have a valid tenant record.",
      404,
    );
  }

  if (!tenancy.units) {
    throw new AppError(
      "UNIT_NOT_FOUND",
      "This tenancy does not have a valid unit record.",
      404,
    );
  }

  if (!tenancy.units.properties) {
    throw new AppError(
      "PROPERTY_NOT_FOUND",
      "This tenancy does not have a valid property record.",
      404,
    );
  }

  const draftSeed: QuitNoticeDetailRow = {
    id: "",
    landlord_id: landlord.id,
    tenant_id: tenancy.tenant_id,
    tenancy_id: tenancy.id,
    unit_id: tenancy.unit_id,
    property_id: tenancy.units.properties.id,
    notice_type: input.noticeType,
    status: "draft",
    notice_date: input.noticeDate,
    vacate_by_date: input.vacateByDate,
    reason: input.reason.trim(),
    landlord_notes: input.landlordNotes?.trim() || null,
    delivery_method: input.deliveryMethod ?? "whatsapp",
    delivery_metadata: {},
    document_body: null,
    pdf_path: null,
    issued_at: null,
    issued_by: null,
    delivered_at: null,
    acknowledged_at: null,
    withdrawn_at: null,
    withdrawn_reason: null,
    metadata: {},
    created_by: landlord.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    tenants: tenancy.tenants,
    tenancies: {
      id: tenancy.id,
      tenancy_reference: tenancy.tenancy_reference,
      start_date: tenancy.start_date,
      end_date: tenancy.end_date,
      rent_amount: tenancy.rent_amount,
      currency_code: tenancy.currency_code,
    },
    units: tenancy.units,
  };

  const documentBody = buildQuitNoticeTemplate(draftSeed);

  const quitNotice = await createQuitNoticeDraft(supabase, {
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    unitId: tenancy.unit_id,
    propertyId: tenancy.units.properties.id,
    noticeType: input.noticeType,
    noticeDate: input.noticeDate,
    vacateByDate: input.vacateByDate,
    reason: input.reason.trim(),
    landlordNotes: input.landlordNotes?.trim() || null,
    deliveryMethod: input.deliveryMethod ?? "whatsapp",
    documentBody,
    metadata: {
      tenancy_reference: tenancy.tenancy_reference,
      tenant_name: tenancy.tenants.full_name,
      property_name: tenancy.units.properties.property_name,
      unit_identifier: tenancy.units.unit_identifier,
      source: "landlord_quit_notice_flow",
    },
    createdBy: landlord.id,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: quitNotice.tenant_id,
    tenancyId: quitNotice.tenancy_id,
    unitId: quitNotice.unit_id,
    propertyId: quitNotice.property_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.quitNoticeDrafted,
    entityType: AUDIT_ENTITY_TYPES.quitNotice,
    entityId: quitNotice.id,
    description: "Quit notice draft created.",
    metadata: {
      quit_notice_id: quitNotice.id,
      notice_type: quitNotice.notice_type,
      status: quitNotice.status,
      notice_date: quitNotice.notice_date,
      vacate_by_date: quitNotice.vacate_by_date,
      delivery_method: quitNotice.delivery_method,
    },
  });

  return quitNotice;
}

export async function createTenantMoveOutNoticeForCurrentTenant(
  input: CreateTenantMoveOutNoticeInput,
) {
  const user = await requireTenant();
  const supabase = createSupabaseAdminClient();

  validateTenantMoveOutDate(input.plannedMoveOutDate);

  assertTextLength({
    value: input.reason,
    code: "MOVE_OUT_REASON_REQUIRED",
    message: "Enter a short note about your move-out plan.",
    minLength: 5,
  });

  const tenant = await getTenantDashboardTenantByProfile(supabase, {
    profileId: user.id,
    phoneNumber: user.phoneNumber,
  });

  if (!tenant) {
    throw new AppError(
      "TENANT_RECORD_NOT_FOUND",
      "We could not find your tenant record.",
      404,
    );
  }

  const activeTenancy = await getActiveTenantTenancy(supabase, tenant.id);

  if (!activeTenancy) {
    throw new AppError(
      "ACTIVE_TENANCY_NOT_FOUND",
      "You do not have an active tenancy to submit a move-out notice for.",
      404,
    );
  }

  const existingMoveOutNotice = await getActiveTenantIntentToVacateForTenancy(
    supabase,
    activeTenancy.id,
  );

  if (existingMoveOutNotice) {
    throw new AppError(
      "MOVE_OUT_NOTICE_ALREADY_EXISTS",
      "You already have an active move-out notice for this tenancy.",
      400,
    );
  }

  const tenancy = await getTenancyById(supabase, activeTenancy.id);

  if (
    tenancy.tenant_id !== tenant.id ||
    tenancy.landlord_id !== tenant.landlord_id
  ) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to submit a move-out notice for this tenancy.",
      403,
    );
  }

  if (tenancy.status !== "active") {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Move-out notice can only be submitted for an active tenancy.",
      400,
    );
  }

  if (!tenancy.tenants || !tenancy.units || !tenancy.units.properties) {
    throw new AppError(
      "TENANCY_RECORD_INCOMPLETE",
      "This tenancy record is incomplete. Please contact your landlord.",
      400,
    );
  }

  const noticeDate = toDateOnly(new Date());

  const draftSeed: QuitNoticeDetailRow = {
    id: "",
    landlord_id: tenancy.landlord_id,
    tenant_id: tenancy.tenant_id,
    tenancy_id: tenancy.id,
    unit_id: tenancy.unit_id,
    property_id: tenancy.units.properties.id,
    notice_type: "tenant_intent_to_vacate",
    status: "draft",
    notice_date: noticeDate,
    vacate_by_date: input.plannedMoveOutDate,
    reason: input.reason.trim(),
    landlord_notes: null,
    delivery_method: "other",
    delivery_metadata: {},
    document_body: null,
    pdf_path: null,
    issued_at: null,
    issued_by: null,
    delivered_at: null,
    acknowledged_at: null,
    withdrawn_at: null,
    withdrawn_reason: null,
    metadata: {},
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    tenants: tenancy.tenants,
    tenancies: {
      id: tenancy.id,
      tenancy_reference: tenancy.tenancy_reference,
      start_date: tenancy.start_date,
      end_date: tenancy.end_date,
      rent_amount: tenancy.rent_amount,
      currency_code: tenancy.currency_code,
    },
    units: tenancy.units,
  };

  const documentBody = buildQuitNoticeTemplate(draftSeed);

  const draft = await createQuitNoticeDraft(supabase, {
    landlordId: tenancy.landlord_id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    unitId: tenancy.unit_id,
    propertyId: tenancy.units.properties.id,
    noticeType: "tenant_intent_to_vacate",
    noticeDate,
    vacateByDate: input.plannedMoveOutDate,
    reason: input.reason.trim(),
    landlordNotes: null,
    deliveryMethod: "other",
    documentBody,
    metadata: {
      tenancy_reference: tenancy.tenancy_reference,
      tenant_name: tenancy.tenants.full_name,
      property_name: tenancy.units.properties.property_name,
      unit_identifier: tenancy.units.unit_identifier,
      source: "tenant_dashboard_move_out_notice",
    },
    createdBy: user.id,
  });

  const issuedNotice = await issueQuitNotice(supabase, {
    quitNoticeId: draft.id,
    issuedBy: user.id,
    deliveryMetadata: {
      submitted_from: "tenant_dashboard",
      delivery_status: "submitted_not_confirmed",
      tenant_profile_id: user.id,
    },
  });

  await writeAuditLog({
    landlordId: issuedNotice.landlord_id,
    tenantId: issuedNotice.tenant_id,
    tenancyId: issuedNotice.tenancy_id,
    unitId: issuedNotice.unit_id,
    propertyId: issuedNotice.property_id,
    actorProfileId: user.id,
    actorRole: AUDIT_ACTOR_ROLES.tenant,
    eventType: AUDIT_EVENT_TYPES.tenantMoveOutRequested,
    entityType: AUDIT_ENTITY_TYPES.quitNotice,
    entityId: issuedNotice.id,
    description: "Tenant submitted intention to move out.",
    metadata: {
      quit_notice_id: issuedNotice.id,
      notice_type: issuedNotice.notice_type,
      status: issuedNotice.status,
      notice_date: issuedNotice.notice_date,
      planned_move_out_date: issuedNotice.vacate_by_date,
      tenant_name: issuedNotice.tenants?.full_name ?? tenant.full_name,
      property_name:
        issuedNotice.units?.properties?.property_name ??
        tenant.units?.properties?.property_name ??
        null,
      unit_identifier:
        issuedNotice.units?.unit_identifier ??
        tenant.units?.unit_identifier ??
        null,
      source: "tenant_dashboard",
    },
  });

  return issuedNotice;
}

export async function confirmTenantMoveOutForCurrentLandlord(
  input: ConfirmTenantMoveOutInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const quitNotice = await getQuitNoticeById(supabase, input.quitNoticeId);

  if (quitNotice.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to confirm this move-out.",
      403,
    );
  }

  if (quitNotice.status !== "issued" && quitNotice.status !== "delivered") {
    throw new AppError(
      "QUIT_NOTICE_NOT_CONFIRMABLE",
      "Only an issued or delivered notice can be used to confirm move-out.",
      400,
    );
  }

  const tenancy = await getTenancyById(supabase, quitNotice.tenancy_id);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to close this tenancy.",
      403,
    );
  }

  if (tenancy.status !== "active") {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "This tenancy is no longer active.",
      400,
    );
  }

  validateActualMoveOutDate({
    actualMoveOutDate: input.actualMoveOutDate,
    tenancyStartDate: tenancy.start_date,
  });

  const finalNote = input.finalNote?.trim() || null;

  const terminationReason = [
    `Move-out confirmed from notice ${quitNotice.id}.`,
    `Notice type: ${quitNotice.notice_type}.`,
    `Actual move-out date: ${input.actualMoveOutDate}.`,
    finalNote ? `Final note: ${finalNote}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const terminatedTenancy = await terminateTenancy(supabase, {
    tenancyId: tenancy.id,
    reason: terminationReason,
    actualMoveOutDate: input.actualMoveOutDate,
  });

  const updatedUnit = await markUnitVacant(supabase, tenancy.unit_id);

  const acknowledgedNotice = await acknowledgeQuitNotice(supabase, {
    quitNoticeId: quitNotice.id,
    deliveryMetadata: {
      ...quitNotice.delivery_metadata,
      move_out_confirmed_at: new Date().toISOString(),
      actual_move_out_date: input.actualMoveOutDate,
      confirmed_by: landlord.id,
      confirmed_by_name: landlord.fullName,
      final_note: finalNote,
    },
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: quitNotice.tenant_id,
    tenancyId: quitNotice.tenancy_id,
    unitId: quitNotice.unit_id,
    propertyId: quitNotice.property_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenancyMoveOutConfirmed,
    entityType: AUDIT_ENTITY_TYPES.tenancy,
    entityId: tenancy.id,
    description: "Tenant move-out confirmed and tenancy closed.",
    metadata: {
      quit_notice_id: quitNotice.id,
      notice_type: quitNotice.notice_type,
      previous_tenancy_status: tenancy.status,
      new_tenancy_status: terminatedTenancy.status,
      actual_move_out_date: input.actualMoveOutDate,
      final_note: finalNote,
      tenancy_reference: tenancy.tenancy_reference,
      tenant_name: tenancy.tenants?.full_name ?? null,
      property_name: tenancy.units?.properties?.property_name ?? null,
      unit_identifier: tenancy.units?.unit_identifier ?? null,
    },
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: quitNotice.tenant_id,
    tenancyId: quitNotice.tenancy_id,
    unitId: quitNotice.unit_id,
    propertyId: quitNotice.property_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.unitStatusChanged,
    entityType: AUDIT_ENTITY_TYPES.unit,
    entityId: quitNotice.unit_id,
    description: "Unit marked vacant after move-out confirmation.",
    metadata: {
      quit_notice_id: quitNotice.id,
      previous_status: "occupied",
      current_status: updatedUnit.status,
      actual_move_out_date: input.actualMoveOutDate,
      unit_identifier: tenancy.units?.unit_identifier ?? null,
      property_name: tenancy.units?.properties?.property_name ?? null,
    },
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: quitNotice.tenant_id,
    tenancyId: quitNotice.tenancy_id,
    unitId: quitNotice.unit_id,
    propertyId: quitNotice.property_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.quitNoticeAcknowledged,
    entityType: AUDIT_ENTITY_TYPES.quitNotice,
    entityId: acknowledgedNotice.id,
    description: "Quit notice acknowledged through move-out confirmation.",
    metadata: {
      quit_notice_id: acknowledgedNotice.id,
      notice_type: acknowledgedNotice.notice_type,
      status: acknowledgedNotice.status,
      acknowledged_at: acknowledgedNotice.acknowledged_at,
      actual_move_out_date: input.actualMoveOutDate,
    },
  });

  return {
    quitNotice: acknowledgedNotice,
    tenancy: terminatedTenancy,
    unit: updatedUnit,
  };
}

export async function issueQuitNoticeForCurrentLandlord(
  input: IssueQuitNoticeInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const existingNotice = await getQuitNoticeById(supabase, input.quitNoticeId);

  if (existingNotice.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to issue this quit notice.",
      403,
    );
  }

  if (existingNotice.status !== "draft") {
    throw new AppError(
      "QUIT_NOTICE_NOT_DRAFT",
      "Only a draft quit notice can be issued.",
      400,
    );
  }

  const adminSupabase = createSupabaseAdminClient();
  const noticeWithPdf = existingNotice.pdf_path
    ? existingNotice
    : await generateAndStoreQuitNoticePdf(adminSupabase, existingNotice);

  const pdfDownloadUrl = await createSignedQuitNoticePdfUrl(
    noticeWithPdf.pdf_path,
  );

  const whatsappMessage = buildQuitNoticeWhatsAppMessage({
    quitNotice: noticeWithPdf,
    pdfDownloadUrl,
  });

  const whatsappUrl = buildWaMeUrl({
    phoneNumber: noticeWithPdf.tenants?.phone_number,
    message: whatsappMessage,
  });

  const quitNotice = await issueQuitNotice(supabase, {
    quitNoticeId: noticeWithPdf.id,
    issuedBy: landlord.id,
    deliveryMetadata: {
      prepared_channel: noticeWithPdf.delivery_method,
      delivery_status: "prepared_not_sent",
      issued_by_name: landlord.fullName,
      pdf_path: noticeWithPdf.pdf_path,
      whatsapp_url: whatsappUrl,
      whatsapp_message: whatsappMessage,
    },
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: quitNotice.tenant_id,
    tenancyId: quitNotice.tenancy_id,
    unitId: quitNotice.unit_id,
    propertyId: quitNotice.property_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.quitNoticeIssued,
    entityType: AUDIT_ENTITY_TYPES.quitNotice,
    entityId: quitNotice.id,
    description: "Quit notice issued.",
    metadata: {
      quit_notice_id: quitNotice.id,
      notice_type: quitNotice.notice_type,
      status: quitNotice.status,
      issued_at: quitNotice.issued_at,
      delivery_method: quitNotice.delivery_method,
      delivery_status: "prepared_not_sent",
      pdf_path: quitNotice.pdf_path,
    },
  });

  return quitNotice;
}

export async function withdrawQuitNoticeForCurrentLandlord(
  input: WithdrawQuitNoticeInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  assertTextLength({
    value: input.withdrawnReason,
    code: "WITHDRAW_REASON_REQUIRED",
    message: "Enter a reason for withdrawing this quit notice.",
    minLength: 5,
  });

  const existingNotice = await getQuitNoticeById(supabase, input.quitNoticeId);

  if (existingNotice.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to withdraw this quit notice.",
      403,
    );
  }

  if (
    existingNotice.status !== "draft" &&
    existingNotice.status !== "issued" &&
    existingNotice.status !== "delivered"
  ) {
    throw new AppError(
      "QUIT_NOTICE_CANNOT_BE_WITHDRAWN",
      "This quit notice can no longer be withdrawn.",
      400,
    );
  }

  const quitNotice = await withdrawQuitNotice(supabase, {
    quitNoticeId: input.quitNoticeId,
    withdrawnReason: input.withdrawnReason.trim(),
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: quitNotice.tenant_id,
    tenancyId: quitNotice.tenancy_id,
    unitId: quitNotice.unit_id,
    propertyId: quitNotice.property_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.quitNoticeWithdrawn,
    entityType: AUDIT_ENTITY_TYPES.quitNotice,
    entityId: quitNotice.id,
    description: "Quit notice withdrawn.",
    metadata: {
      quit_notice_id: quitNotice.id,
      notice_type: quitNotice.notice_type,
      status: quitNotice.status,
      withdrawn_at: quitNotice.withdrawn_at,
      withdrawn_reason: quitNotice.withdrawn_reason,
    },
  });

  return quitNotice;
}

export async function generateQuitNoticePdfForCurrentLandlord(
  input: GenerateQuitNoticePdfInput,
) {
  const landlord = await requireLandlord();
  const userSupabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  const quitNotice = await getQuitNoticeById(userSupabase, input.quitNoticeId);

  if (quitNotice.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to generate this quit notice PDF.",
      403,
    );
  }

  const noticeWithPdf = await generateAndStoreQuitNoticePdf(
    adminSupabase,
    quitNotice,
  );

  const pdfDownloadUrl = await createSignedQuitNoticePdfUrl(
    noticeWithPdf.pdf_path,
  );

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: noticeWithPdf.tenant_id,
    tenancyId: noticeWithPdf.tenancy_id,
    unitId: noticeWithPdf.unit_id,
    propertyId: noticeWithPdf.property_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.quitNoticeDownloaded,
    entityType: AUDIT_ENTITY_TYPES.quitNotice,
    entityId: noticeWithPdf.id,
    description: "Quit notice PDF prepared.",
    metadata: {
      quit_notice_id: noticeWithPdf.id,
      notice_type: noticeWithPdf.notice_type,
      status: noticeWithPdf.status,
      pdf_path: noticeWithPdf.pdf_path,
    },
  });

  return {
    quitNotice: noticeWithPdf,
    pdfDownloadUrl,
  };
}

export async function prepareQuitNoticeDeliveryForCurrentLandlord(
  quitNoticeId: string,
): Promise<PreparedQuitNoticeDelivery> {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const quitNotice = await getQuitNoticeById(supabase, quitNoticeId);

  if (quitNotice.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to prepare delivery for this quit notice.",
      403,
    );
  }

  if (quitNotice.status === "withdrawn") {
    throw new AppError(
      "QUIT_NOTICE_WITHDRAWN",
      "A withdrawn quit notice cannot be sent.",
      400,
    );
  }

  if (quitNotice.status === "expired") {
    throw new AppError(
      "QUIT_NOTICE_EXPIRED",
      "An expired quit notice cannot be sent.",
      400,
    );
  }

  const pdfDownloadUrl = await createSignedQuitNoticePdfUrl(
    quitNotice.pdf_path,
  );

  const whatsappMessage = buildQuitNoticeWhatsAppMessage({
    quitNotice,
    pdfDownloadUrl,
  });

  const whatsappUrl = buildWaMeUrl({
    phoneNumber: quitNotice.tenants?.phone_number,
    message: whatsappMessage,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: quitNotice.tenant_id,
    tenancyId: quitNotice.tenancy_id,
    unitId: quitNotice.unit_id,
    propertyId: quitNotice.property_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.quitNoticeSentPrepared,
    entityType: AUDIT_ENTITY_TYPES.quitNotice,
    entityId: quitNotice.id,
    description: "Quit notice WhatsApp draft prepared.",
    metadata: {
      quit_notice_id: quitNotice.id,
      notice_type: quitNotice.notice_type,
      status: quitNotice.status,
      pdf_path: quitNotice.pdf_path,
      whatsapp_url: whatsappUrl,
      delivery_status: "prepared_not_sent",
    },
  });

  return {
    quitNotice,
    pdfDownloadUrl,
    whatsappMessage,
    whatsappUrl,
  };
}

export async function getQuitNoticePdfDownloadUrlForCurrentLandlord(
  quitNoticeId: string,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const quitNotice = await getQuitNoticeById(supabase, quitNoticeId);

  if (quitNotice.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to download this quit notice PDF.",
      403,
    );
  }

  if (!quitNotice.pdf_path) {
    throw new AppError(
      "QUIT_NOTICE_PDF_NOT_READY",
      "Generate the quit notice PDF before downloading it.",
      400,
    );
  }

  return createSignedQuitNoticePdfUrl(quitNotice.pdf_path);
}

export async function getCurrentLandlordQuitNotices() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return getQuitNoticesForLandlord(supabase, landlord.id);
}

export async function getCurrentLandlordQuitNotice(quitNoticeId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const quitNotice = await getQuitNoticeById(supabase, quitNoticeId);

  if (quitNotice.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this quit notice.",
      403,
    );
  }

  return quitNotice;
}

export async function getCurrentLandlordQuitNoticesForTenancy(
  tenancyId: string,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyById(supabase, tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view quit notices for this tenancy.",
      403,
    );
  }

  return getQuitNoticesForTenancy(supabase, tenancyId);
}
