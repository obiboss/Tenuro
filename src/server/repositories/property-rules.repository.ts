import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatePropertyRuleInput,
  PropertyRuleCode,
  UpdatePropertyRuleInput,
} from "@/server/validators/property-rule.schema";

export type PropertyRuleCategory =
  | "occupancy"
  | "pets"
  | "payment"
  | "noise"
  | "business_use"
  | "maintenance"
  | "safety"
  | "documentation"
  | "other";

export type PropertyRuleEnforcement =
  | "information_only"
  | "landlord_review"
  | "blocks_onboarding";

export type PropertyRuleAppliesTo =
  | "all_tenants"
  | "new_tenants"
  | "renewing_tenants";

export type PropertyRuleStatus = "active" | "inactive" | "archived";

export type PropertyRuleMetadata = {
  rule_code?: PropertyRuleCode;
  config?: Record<string, unknown>;
  source?: "guided_preset" | "custom_house_rule";
};

export type PropertyRuleRow = {
  id: string;
  landlord_id: string;
  property_id: string;
  unit_id: string | null;
  title: string;
  description: string;
  category: PropertyRuleCategory;
  enforcement: PropertyRuleEnforcement;
  applies_to: PropertyRuleAppliesTo;
  status: PropertyRuleStatus;
  requires_tenant_acknowledgement: boolean;
  sort_order: number;
  metadata: PropertyRuleMetadata;
  created_by: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyRuleDetailRow = PropertyRuleRow & {
  properties: {
    id: string;
    property_name: string;
    address: string | null;
  } | null;
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
  } | null;
};

const PROPERTY_RULE_SELECT = `
  id,
  landlord_id,
  property_id,
  unit_id,
  title,
  description,
  category,
  enforcement,
  applies_to,
  status,
  requires_tenant_acknowledgement,
  sort_order,
  metadata,
  created_by,
  archived_at,
  deleted_at,
  created_at,
  updated_at
`;

const PROPERTY_RULE_DETAIL_SELECT = `
  id,
  landlord_id,
  property_id,
  unit_id,
  title,
  description,
  category,
  enforcement,
  applies_to,
  status,
  requires_tenant_acknowledgement,
  sort_order,
  metadata,
  created_by,
  archived_at,
  deleted_at,
  created_at,
  updated_at,
  properties (
    id,
    property_name,
    address
  ),
  units (
    id,
    unit_identifier,
    building_name
  )
`;

export async function createPropertyRule(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    input: CreatePropertyRuleInput;
    createdBy: string;
  },
) {
  const metadata: PropertyRuleMetadata = {
    rule_code: params.input.ruleCode,
    config: params.input.config,
    source:
      params.input.ruleCode === "other_house_rule"
        ? "custom_house_rule"
        : "guided_preset",
  };

  const { data, error } = await supabase
    .from("property_rules")
    .insert({
      landlord_id: params.landlordId,
      property_id: params.input.propertyId,
      unit_id: params.input.unitId ?? null,
      title: params.input.title.trim(),
      description: params.input.description.trim(),
      category: params.input.category,
      enforcement: params.input.enforcement,
      applies_to: params.input.appliesTo,
      requires_tenant_acknowledgement:
        params.input.requiresTenantAcknowledgement,
      sort_order: params.input.sortOrder,
      metadata,
      created_by: params.createdBy,
    })
    .select(PROPERTY_RULE_DETAIL_SELECT)
    .single<PropertyRuleDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePropertyRule(
  supabase: SupabaseClient,
  params: {
    propertyRuleId: string;
    input: UpdatePropertyRuleInput;
  },
) {
  const updatePayload: Partial<{
    unit_id: string | null;
    title: string;
    description: string;
    category: PropertyRuleCategory;
    enforcement: PropertyRuleEnforcement;
    applies_to: PropertyRuleAppliesTo;
    status: "active" | "inactive";
    requires_tenant_acknowledgement: boolean;
    sort_order: number;
    metadata: PropertyRuleMetadata;
  }> = {};

  if (params.input.unitId !== undefined) {
    updatePayload.unit_id = params.input.unitId;
  }

  if (params.input.title !== undefined) {
    updatePayload.title = params.input.title.trim();
  }

  if (params.input.description !== undefined) {
    updatePayload.description = params.input.description.trim();
  }

  if (params.input.category !== undefined) {
    updatePayload.category = params.input.category;
  }

  if (params.input.enforcement !== undefined) {
    updatePayload.enforcement = params.input.enforcement;
  }

  if (params.input.appliesTo !== undefined) {
    updatePayload.applies_to = params.input.appliesTo;
  }

  if (params.input.status !== undefined) {
    updatePayload.status = params.input.status;
  }

  if (params.input.requiresTenantAcknowledgement !== undefined) {
    updatePayload.requires_tenant_acknowledgement =
      params.input.requiresTenantAcknowledgement;
  }

  if (params.input.sortOrder !== undefined) {
    updatePayload.sort_order = params.input.sortOrder;
  }

  if (params.input.config !== undefined) {
    updatePayload.metadata = {
      config: params.input.config,
    };
  }

  const { data, error } = await supabase
    .from("property_rules")
    .update(updatePayload)
    .eq("id", params.propertyRuleId)
    .is("deleted_at", null)
    .neq("status", "archived")
    .select(PROPERTY_RULE_DETAIL_SELECT)
    .single<PropertyRuleDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function archivePropertyRule(
  supabase: SupabaseClient,
  propertyRuleId: string,
) {
  const { data, error } = await supabase
    .from("property_rules")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("id", propertyRuleId)
    .is("deleted_at", null)
    .neq("status", "archived")
    .select(PROPERTY_RULE_SELECT)
    .single<PropertyRuleRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPropertyRuleById(
  supabase: SupabaseClient,
  propertyRuleId: string,
) {
  const { data, error } = await supabase
    .from("property_rules")
    .select(PROPERTY_RULE_DETAIL_SELECT)
    .eq("id", propertyRuleId)
    .is("deleted_at", null)
    .single<PropertyRuleDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPropertyRulesForProperty(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    propertyId: string;
    includeArchived?: boolean;
  },
) {
  let query = supabase
    .from("property_rules")
    .select(PROPERTY_RULE_DETAIL_SELECT)
    .eq("landlord_id", params.landlordId)
    .eq("property_id", params.propertyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!params.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query.returns<PropertyRuleDetailRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActivePropertyRulesForOnboarding(
  supabase: SupabaseClient,
  params: {
    propertyId: string;
    unitId?: string | null;
  },
) {
  let query = supabase
    .from("property_rules")
    .select(PROPERTY_RULE_DETAIL_SELECT)
    .eq("property_id", params.propertyId)
    .eq("status", "active")
    .in("applies_to", ["all_tenants", "new_tenants"])
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (params.unitId) {
    query = query.or(`unit_id.is.null,unit_id.eq.${params.unitId}`);
  } else {
    query = query.is("unit_id", null);
  }

  const { data, error } = await query.returns<PropertyRuleDetailRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
