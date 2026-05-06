import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditActorRole,
  AuditEntityType,
  AuditEventType,
} from "@/server/constants/audit-events";

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
