import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ManagerMaintenancePriority,
  ManagerMaintenanceStatus,
} from "@/constants/manager";

export type ManagerMaintenanceRequestRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  issue_title: string;
  issue_description: string | null;
  priority: ManagerMaintenancePriority;
  status: ManagerMaintenanceStatus;
  estimated_cost: number;
  actual_cost: number;
  vendor_name: string | null;
  reported_date: string;
  resolved_date: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by_profile_id: string | null;
  updated_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

const MANAGER_MAINTENANCE_REQUEST_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_id,
  tenant_id,
  issue_title,
  issue_description,
  priority,
  status,
  estimated_cost,
  actual_cost,
  vendor_name,
  reported_date,
  resolved_date,
  notes,
  metadata,
  created_by_profile_id,
  updated_by_profile_id,
  created_at,
  updated_at
`;

export async function createManagerMaintenanceRequest(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string | null;
    tenantId: string | null;
    issueTitle: string;
    issueDescription: string | null;
    priority: ManagerMaintenancePriority;
    status: ManagerMaintenanceStatus;
    estimatedCost: number;
    actualCost: number;
    vendorName: string | null;
    reportedDate: string;
    resolvedDate: string | null;
    notes: string | null;
    metadata: Record<string, unknown>;
    createdByProfileId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_maintenance_requests")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      tenant_id: params.tenantId,
      issue_title: params.issueTitle,
      issue_description: params.issueDescription,
      priority: params.priority,
      status: params.status,
      estimated_cost: params.estimatedCost,
      actual_cost: params.actualCost,
      vendor_name: params.vendorName,
      reported_date: params.reportedDate,
      resolved_date: params.resolvedDate,
      notes: params.notes,
      metadata: params.metadata,
      created_by_profile_id: params.createdByProfileId,
      updated_by_profile_id: params.createdByProfileId,
    })
    .select(MANAGER_MAINTENANCE_REQUEST_SELECT)
    .single<ManagerMaintenanceRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerMaintenanceRequests(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_maintenance_requests")
    .select(MANAGER_MAINTENANCE_REQUEST_SELECT)
    .eq("organization_id", organizationId)
    .order("reported_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ManagerMaintenanceRequestRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
