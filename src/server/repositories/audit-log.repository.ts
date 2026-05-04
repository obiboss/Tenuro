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
