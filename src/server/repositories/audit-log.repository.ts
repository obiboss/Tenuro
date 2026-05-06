import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditActorRole,
  AuditEntityType,
  AuditEventType,
} from "@/server/constants/audit-events";
import { AUDIT_EVENT_TYPES } from "@/server/constants/audit-events";

export type AuditLogInsert = {
  landlordId?: string | null;
  tenantId?: string | null;
  tenancyId?: string | null;
  unitId?: string | null;
  propertyId?: string | null;
  actorProfileId?: string | null;
  actorRole: AuditActorRole;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type LandlordAuditLogRecord = {
  id: string;
  landlordId: string | null;
  tenantId: string | null;
  tenancyId: string | null;
  unitId: string | null;
  propertyId: string | null;
  actorProfileId: string | null;
  actorRole: AuditActorRole;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type RenewalReminderAuditRecord = {
  id: string;
  landlordId: string | null;
  tenantId: string | null;
  tenancyId: string | null;
  unitId: string | null;
  propertyId: string | null;
  description: string;
  createdAt: string;
  reminderMarker: string | null;
  reminderChannel: string | null;
  deliveryStatus: string | null;
  runDate: string | null;
  daysUntilRenewal: number | null;
  renewalDate: string | null;
  tenantName: string | null;
  tenantPhoneNumber: string | null;
  propertyName: string | null;
  unitIdentifier: string | null;
  rentAmount: number | null;
  currencyCode: string | null;
  whatsappMessage: string | null;
  whatsappUrl: string | null;
};

type AuditLogRow = {
  id: string;
  landlord_id: string | null;
  tenant_id: string | null;
  tenancy_id: string | null;
  unit_id: string | null;
  property_id: string | null;
  actor_profile_id: string | null;
  actor_role: AuditActorRole;
  event_type: AuditEventType;
  entity_type: AuditEntityType;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

function readMetadataText(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function readMetadataNumber(
  metadata: Record<string, unknown>,
  key: string,
): number | null {
  const value = metadata[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function mapAuditLogRow(row: AuditLogRow): LandlordAuditLogRecord {
  return {
    id: row.id,
    landlordId: row.landlord_id,
    tenantId: row.tenant_id,
    tenancyId: row.tenancy_id,
    unitId: row.unit_id,
    propertyId: row.property_id,
    actorProfileId: row.actor_profile_id,
    actorRole: row.actor_role,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    metadata: row.metadata ?? {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function mapRenewalReminderAuditRow(
  row: AuditLogRow,
): RenewalReminderAuditRecord {
  const metadata = row.metadata ?? {};

  return {
    id: row.id,
    landlordId: row.landlord_id,
    tenantId: row.tenant_id,
    tenancyId: row.tenancy_id,
    unitId: row.unit_id,
    propertyId: row.property_id,
    description: row.description,
    createdAt: row.created_at,
    reminderMarker: readMetadataText(metadata, "reminder_marker"),
    reminderChannel: readMetadataText(metadata, "reminder_channel"),
    deliveryStatus: readMetadataText(metadata, "delivery_status"),
    runDate: readMetadataText(metadata, "run_date"),
    daysUntilRenewal: readMetadataNumber(metadata, "days_until_renewal"),
    renewalDate: readMetadataText(metadata, "renewal_date"),
    tenantName: readMetadataText(metadata, "tenant_name"),
    tenantPhoneNumber: readMetadataText(metadata, "tenant_phone_number"),
    propertyName: readMetadataText(metadata, "property_name"),
    unitIdentifier: readMetadataText(metadata, "unit_identifier"),
    rentAmount: readMetadataNumber(metadata, "rent_amount"),
    currencyCode: readMetadataText(metadata, "currency_code"),
    whatsappMessage: readMetadataText(metadata, "whatsapp_message"),
    whatsappUrl: readMetadataText(metadata, "whatsapp_url"),
  };
}

export async function insertAuditLog(
  supabase: SupabaseClient,
  input: AuditLogInsert,
) {
  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: input.landlordId ?? null,
    tenant_id: input.tenantId ?? null,
    tenancy_id: input.tenancyId ?? null,
    unit_id: input.unitId ?? null,
    property_id: input.propertyId ?? null,
    actor_profile_id: input.actorProfileId ?? null,
    actor_role: input.actorRole,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    description: input.description,
    metadata: input.metadata ?? {},
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function listAuditLogsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
  limit = 75,
): Promise<LandlordAuditLogRecord[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      [
        "id",
        "landlord_id",
        "tenant_id",
        "tenancy_id",
        "unit_id",
        "property_id",
        "actor_profile_id",
        "actor_role",
        "event_type",
        "entity_type",
        "entity_id",
        "description",
        "metadata",
        "ip_address",
        "user_agent",
        "created_at",
      ].join(","),
    )
    .eq("landlord_id", landlordId)
    .order("created_at", { ascending: false })
    .limit(safeLimit)
    .returns<AuditLogRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAuditLogRow);
}

export async function listRenewalReminderAuditLogsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
  limit = 200,
): Promise<RenewalReminderAuditRecord[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 500);

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      [
        "id",
        "landlord_id",
        "tenant_id",
        "tenancy_id",
        "unit_id",
        "property_id",
        "actor_profile_id",
        "actor_role",
        "event_type",
        "entity_type",
        "entity_id",
        "description",
        "metadata",
        "ip_address",
        "user_agent",
        "created_at",
      ].join(","),
    )
    .eq("landlord_id", landlordId)
    .eq("event_type", AUDIT_EVENT_TYPES.renewalReminderPrepared)
    .order("created_at", { ascending: false })
    .limit(safeLimit)
    .returns<AuditLogRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRenewalReminderAuditRow);
}
