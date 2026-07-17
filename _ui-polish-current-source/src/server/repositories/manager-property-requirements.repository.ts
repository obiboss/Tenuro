import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ManagerTenantRequirementAnswerType,
  ManagerTenantRequirementCode,
  ManagerTenantRequirementMismatchAction,
} from "@/server/validators/manager-property-requirements.schema";

export type ManagerPropertyTenantRequirementRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  requirement_code: ManagerTenantRequirementCode;
  title: string;
  question_text: string;
  description: string | null;
  answer_type: ManagerTenantRequirementAnswerType;
  expected_boolean: boolean | null;
  minimum_value: number | null;
  maximum_value: number | null;
  required_guarantor_count: number | null;
  mismatch_action: ManagerTenantRequirementMismatchAction;
  include_in_agreement: boolean;
  agreement_clause: string | null;
  status: "active" | "inactive" | "archived";
  sort_order: number;
  created_by_profile_id: string | null;
  metadata: Record<string, unknown>;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

const REQUIREMENT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  requirement_code,
  title,
  question_text,
  description,
  answer_type,
  expected_boolean,
  minimum_value,
  maximum_value,
  required_guarantor_count,
  mismatch_action,
  include_in_agreement,
  agreement_clause,
  status,
  sort_order,
  created_by_profile_id,
  metadata,
  archived_at,
  created_at,
  updated_at
`;

export async function listManagerPropertyTenantRequirements(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId: string;
    activeOnly?: boolean;
  },
) {
  let query = supabase
    .from("manager_property_tenant_requirements")
    .select(REQUIREMENT_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("property_id", params.propertyId);

  if (params.activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true })
    .returns<ManagerPropertyTenantRequirementRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function replaceManagerPropertyTenantRequirements(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    createdByProfileId: string;
    revisionId: string;
    requirements: Array<{
      requirementCode: ManagerTenantRequirementCode;
      title: string;
      questionText: string;
      description: string | null;
      answerType: ManagerTenantRequirementAnswerType;
      expectedBoolean: boolean | null;
      minimumValue: number | null;
      maximumValue: number | null;
      requiredGuarantorCount: number | null;
      mismatchAction: ManagerTenantRequirementMismatchAction;
      includeInAgreement: boolean;
      agreementClause: string | null;
      sortOrder: number;
    }>;
  },
) {
  const existing =
    await listManagerPropertyTenantRequirements(supabase, {
      organizationId: params.organizationId,
      propertyId: params.propertyId,
      activeOnly: true,
    });

  const existingIds = existing.map((requirement) => requirement.id);
  const archivedAt = new Date().toISOString();

  if (existingIds.length > 0) {
    const { error: archiveError } = await supabase
      .from("manager_property_tenant_requirements")
      .update({
        status: "archived",
        archived_at: archivedAt,
      })
      .eq("organization_id", params.organizationId)
      .eq("landlord_client_id", params.landlordClientId)
      .eq("property_id", params.propertyId)
      .in("id", existingIds);

    if (archiveError) {
      throw archiveError;
    }
  }

  if (params.requirements.length === 0) {
    return [];
  }

  const { data, error: insertError } = await supabase
    .from("manager_property_tenant_requirements")
    .insert(
      params.requirements.map((requirement) => ({
        organization_id: params.organizationId,
        landlord_client_id: params.landlordClientId,
        property_id: params.propertyId,
        requirement_code: requirement.requirementCode,
        title: requirement.title,
        question_text: requirement.questionText,
        description: requirement.description,
        answer_type: requirement.answerType,
        expected_boolean: requirement.expectedBoolean,
        minimum_value: requirement.minimumValue,
        maximum_value: requirement.maximumValue,
        required_guarantor_count:
          requirement.requiredGuarantorCount,
        mismatch_action: requirement.mismatchAction,
        include_in_agreement: requirement.includeInAgreement,
        agreement_clause: requirement.agreementClause,
        status: "active",
        sort_order: requirement.sortOrder,
        created_by_profile_id: params.createdByProfileId,
        metadata: {
          source: "bopa_manager_property_requirements",
          revision_id: params.revisionId,
        },
      })),
    )
    .select(REQUIREMENT_SELECT)
    .returns<ManagerPropertyTenantRequirementRow[]>();

  if (!insertError) {
    return data;
  }

  if (existingIds.length > 0) {
    const { error: restoreError } = await supabase
      .from("manager_property_tenant_requirements")
      .update({
        status: "active",
        archived_at: null,
      })
      .eq("organization_id", params.organizationId)
      .eq("landlord_client_id", params.landlordClientId)
      .eq("property_id", params.propertyId)
      .in("id", existingIds);

    if (restoreError) {
      throw restoreError;
    }
  }

  throw insertError;
}
