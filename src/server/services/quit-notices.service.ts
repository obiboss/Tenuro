import "server-only";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  createQuitNoticeDraft,
  getQuitNoticeById,
  getQuitNoticesForLandlord,
  getQuitNoticesForTenancy,
  issueQuitNotice,
  withdrawQuitNotice,
  type QuitNoticeDeliveryMethod,
  type QuitNoticeType,
} from "@/server/repositories/quit-notices.repository";
import { getTenancyById } from "@/server/repositories/tenancies.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";

export type CreateQuitNoticeDraftInput = {
  tenancyId: string;
  noticeType: QuitNoticeType;
  noticeDate: string;
  vacateByDate: string;
  reason: string;
  landlordNotes?: string | null;
  deliveryMethod?: QuitNoticeDeliveryMethod;
};

export type IssueQuitNoticeInput = {
  quitNoticeId: string;
};

export type WithdrawQuitNoticeInput = {
  quitNoticeId: string;
  withdrawnReason: string;
};

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
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

function buildQuitNoticeDocumentBody(params: {
  tenantName: string;
  landlordName: string;
  propertyName: string;
  unitName: string;
  noticeDate: string;
  vacateByDate: string;
  reason: string;
}) {
  return [
    "QUIT NOTICE",
    "",
    `Date of Notice: ${params.noticeDate}`,
    "",
    `To: ${params.tenantName}`,
    `Property: ${params.propertyName}`,
    `Unit: ${params.unitName}`,
    "",
    `This notice is issued by ${params.landlordName}.`,
    "",
    "You are hereby notified to vacate the above-mentioned premises on or before:",
    params.vacateByDate,
    "",
    "Reason:",
    params.reason,
    "",
    "This document is a draft foundation record. Formal PDF generation will be handled in the quit notice PDF batch.",
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

  const documentBody = buildQuitNoticeDocumentBody({
    tenantName: tenancy.tenants.full_name,
    landlordName: landlord.fullName,
    propertyName: tenancy.units.properties.property_name,
    unitName: tenancy.units.unit_identifier,
    noticeDate: input.noticeDate,
    vacateByDate: input.vacateByDate,
    reason: input.reason,
  });

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
      source: "landlord_quit_notice_foundation",
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

  const quitNotice = await issueQuitNotice(supabase, {
    quitNoticeId: input.quitNoticeId,
    issuedBy: landlord.id,
    deliveryMetadata: {
      prepared_channel: existingNotice.delivery_method,
      delivery_status: "prepared_not_sent",
      issued_by_name: landlord.fullName,
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
