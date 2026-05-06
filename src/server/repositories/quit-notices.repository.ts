import type { SupabaseClient } from "@supabase/supabase-js";

export type QuitNoticeType = "landlord_quit_notice" | "tenant_intent_to_vacate";

export type QuitNoticeStatus =
  | "draft"
  | "issued"
  | "delivered"
  | "acknowledged"
  | "expired"
  | "withdrawn";

export type QuitNoticeDeliveryMethod =
  | "whatsapp"
  | "email"
  | "hand_delivery"
  | "other";

export type QuitNoticeRow = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  tenancy_id: string;
  unit_id: string;
  property_id: string;
  notice_type: QuitNoticeType;
  status: QuitNoticeStatus;
  notice_date: string;
  vacate_by_date: string;
  reason: string;
  landlord_notes: string | null;
  delivery_method: QuitNoticeDeliveryMethod;
  delivery_metadata: Record<string, unknown>;
  document_body: string | null;
  pdf_path: string | null;
  issued_at: string | null;
  issued_by: string | null;
  delivered_at: string | null;
  acknowledged_at: string | null;
  withdrawn_at: string | null;
  withdrawn_reason: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type QuitNoticeDetailRow = QuitNoticeRow & {
  tenants: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
    home_address: string | null;
  } | null;
  tenancies: {
    id: string;
    tenancy_reference: string | null;
    start_date: string | null;
    end_date: string | null;
    rent_amount: number;
    currency_code: string;
  } | null;
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    unit_type: string;
    properties: {
      id: string;
      property_name: string;
      address: string;
    } | null;
  } | null;
};

export type CreateQuitNoticeDraftParams = {
  landlordId: string;
  tenantId: string;
  tenancyId: string;
  unitId: string;
  propertyId: string;
  noticeType: QuitNoticeType;
  noticeDate: string;
  vacateByDate: string;
  reason: string;
  landlordNotes: string | null;
  deliveryMethod: QuitNoticeDeliveryMethod;
  documentBody: string | null;
  metadata: Record<string, unknown>;
  createdBy: string;
};

export type IssueQuitNoticeParams = {
  quitNoticeId: string;
  issuedBy: string;
  deliveryMetadata: Record<string, unknown>;
};

export type AcknowledgeQuitNoticeParams = {
  quitNoticeId: string;
  deliveryMetadata: Record<string, unknown>;
};

export type WithdrawQuitNoticeParams = {
  quitNoticeId: string;
  withdrawnReason: string;
};

export type UpdateQuitNoticePdfPathParams = {
  quitNoticeId: string;
  pdfPath: string;
};

const QUIT_NOTICE_SELECT = `
  id,
  landlord_id,
  tenant_id,
  tenancy_id,
  unit_id,
  property_id,
  notice_type,
  status,
  notice_date,
  vacate_by_date,
  reason,
  landlord_notes,
  delivery_method,
  delivery_metadata,
  document_body,
  pdf_path,
  issued_at,
  issued_by,
  delivered_at,
  acknowledged_at,
  withdrawn_at,
  withdrawn_reason,
  metadata,
  created_by,
  created_at,
  updated_at,
  deleted_at
`;

const QUIT_NOTICE_DETAIL_SELECT = `
  id,
  landlord_id,
  tenant_id,
  tenancy_id,
  unit_id,
  property_id,
  notice_type,
  status,
  notice_date,
  vacate_by_date,
  reason,
  landlord_notes,
  delivery_method,
  delivery_metadata,
  document_body,
  pdf_path,
  issued_at,
  issued_by,
  delivered_at,
  acknowledged_at,
  withdrawn_at,
  withdrawn_reason,
  metadata,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  tenants (
    id,
    full_name,
    phone_number,
    email,
    home_address
  ),
  tenancies (
    id,
    tenancy_reference,
    start_date,
    end_date,
    rent_amount,
    currency_code
  ),
  units (
    id,
    unit_identifier,
    building_name,
    unit_type,
    properties (
      id,
      property_name,
      address
    )
  )
`;

export async function createQuitNoticeDraft(
  supabase: SupabaseClient,
  params: CreateQuitNoticeDraftParams,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      tenancy_id: params.tenancyId,
      unit_id: params.unitId,
      property_id: params.propertyId,
      notice_type: params.noticeType,
      status: "draft",
      notice_date: params.noticeDate,
      vacate_by_date: params.vacateByDate,
      reason: params.reason,
      landlord_notes: params.landlordNotes,
      delivery_method: params.deliveryMethod,
      document_body: params.documentBody,
      metadata: params.metadata,
      created_by: params.createdBy,
    })
    .select(QUIT_NOTICE_DETAIL_SELECT)
    .single<QuitNoticeDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getQuitNoticeById(
  supabase: SupabaseClient,
  quitNoticeId: string,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .select(QUIT_NOTICE_DETAIL_SELECT)
    .eq("id", quitNoticeId)
    .is("deleted_at", null)
    .single<QuitNoticeDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getQuitNoticesForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .select(QUIT_NOTICE_DETAIL_SELECT)
    .eq("landlord_id", landlordId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<QuitNoticeDetailRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getQuitNoticesForTenancy(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .select(QUIT_NOTICE_DETAIL_SELECT)
    .eq("tenancy_id", tenancyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<QuitNoticeDetailRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActiveTenantIntentToVacateForTenancy(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .select(QUIT_NOTICE_DETAIL_SELECT)
    .eq("tenancy_id", tenancyId)
    .eq("notice_type", "tenant_intent_to_vacate")
    .in("status", ["draft", "issued", "delivered", "acknowledged"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<QuitNoticeDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function issueQuitNotice(
  supabase: SupabaseClient,
  params: IssueQuitNoticeParams,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .update({
      status: "issued",
      issued_at: new Date().toISOString(),
      issued_by: params.issuedBy,
      delivery_metadata: params.deliveryMetadata,
    })
    .eq("id", params.quitNoticeId)
    .eq("status", "draft")
    .is("deleted_at", null)
    .select(QUIT_NOTICE_DETAIL_SELECT)
    .single<QuitNoticeDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function acknowledgeQuitNotice(
  supabase: SupabaseClient,
  params: AcknowledgeQuitNoticeParams,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      delivery_metadata: params.deliveryMetadata,
    })
    .eq("id", params.quitNoticeId)
    .in("status", ["issued", "delivered"])
    .is("deleted_at", null)
    .select(QUIT_NOTICE_DETAIL_SELECT)
    .single<QuitNoticeDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function withdrawQuitNotice(
  supabase: SupabaseClient,
  params: WithdrawQuitNoticeParams,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .update({
      status: "withdrawn",
      withdrawn_at: new Date().toISOString(),
      withdrawn_reason: params.withdrawnReason,
    })
    .eq("id", params.quitNoticeId)
    .in("status", ["draft", "issued", "delivered"])
    .is("deleted_at", null)
    .select(QUIT_NOTICE_SELECT)
    .single<QuitNoticeRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateQuitNoticePdfPath(
  supabase: SupabaseClient,
  params: UpdateQuitNoticePdfPathParams,
) {
  const { data, error } = await supabase
    .from("quit_notices")
    .update({
      pdf_path: params.pdfPath,
    })
    .eq("id", params.quitNoticeId)
    .is("deleted_at", null)
    .select(QUIT_NOTICE_DETAIL_SELECT)
    .single<QuitNoticeDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}
