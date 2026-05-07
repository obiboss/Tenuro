import "server-only";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getPropertyById } from "@/server/repositories/properties.repository";
import {
  archivePropertyRule,
  createPropertyRule,
  getActivePropertyRulesForOnboarding,
  getPropertyRuleById,
  getPropertyRulesForProperty,
  updatePropertyRule,
} from "@/server/repositories/property-rules.repository";
import { getUnitById } from "@/server/repositories/units.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type {
  ArchivePropertyRuleInput,
  CreatePropertyRuleInput,
  UpdatePropertyRuleInput,
} from "@/server/validators/property-rule.schema";
import { requireLandlord } from "./auth.service";

async function assertCurrentLandlordOwnsProperty(params: {
  landlordId: string;
  propertyId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const property = await getPropertyById(supabase, params.propertyId);

  if (property.landlord_id !== params.landlordId) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to manage rules for this property.",
      403,
    );
  }

  return property;
}

async function assertUnitBelongsToProperty(params: {
  unitId: string | null | undefined;
  propertyId: string;
}) {
  if (!params.unitId) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const unit = await getUnitById(supabase, params.unitId);

  if (unit.property_id !== params.propertyId) {
    throw new AppError(
      "UNIT_PROPERTY_MISMATCH",
      "The selected unit does not belong to this property.",
      400,
    );
  }

  return unit;
}

export async function createPropertyRuleForCurrentLandlord(
  input: CreatePropertyRuleInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const property = await assertCurrentLandlordOwnsProperty({
    landlordId: landlord.id,
    propertyId: input.propertyId,
  });

  const unit = await assertUnitBelongsToProperty({
    propertyId: input.propertyId,
    unitId: input.unitId,
  });

  const propertyRule = await createPropertyRule(supabase, {
    landlordId: landlord.id,
    input,
    createdBy: landlord.id,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    propertyId: input.propertyId,
    unitId: input.unitId ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.propertyRuleCreated,
    entityType: AUDIT_ENTITY_TYPES.propertyRule,
    entityId: propertyRule.id,
    description: `Property rule created: ${propertyRule.title}.`,
    metadata: {
      property_rule_id: propertyRule.id,
      property_name: property.property_name,
      unit_identifier: unit?.unit_identifier ?? null,
      title: propertyRule.title,
      category: propertyRule.category,
      enforcement: propertyRule.enforcement,
      applies_to: propertyRule.applies_to,
      status: propertyRule.status,
      requires_tenant_acknowledgement:
        propertyRule.requires_tenant_acknowledgement,
      sort_order: propertyRule.sort_order,
    },
  });

  return propertyRule;
}

export async function updatePropertyRuleForCurrentLandlord(
  propertyRuleId: string,
  input: UpdatePropertyRuleInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const existingRule = await getPropertyRuleById(supabase, propertyRuleId);

  if (existingRule.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to update this property rule.",
      403,
    );
  }

  await assertUnitBelongsToProperty({
    propertyId: existingRule.property_id,
    unitId: input.unitId,
  });

  const updatedRule = await updatePropertyRule(supabase, {
    propertyRuleId,
    input,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    propertyId: updatedRule.property_id,
    unitId: updatedRule.unit_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.propertyRuleUpdated,
    entityType: AUDIT_ENTITY_TYPES.propertyRule,
    entityId: updatedRule.id,
    description: `Property rule updated: ${updatedRule.title}.`,
    metadata: {
      property_rule_id: updatedRule.id,
      updated_fields: Object.keys(input),
      previous_status: existingRule.status,
      current_status: updatedRule.status,
      previous_enforcement: existingRule.enforcement,
      current_enforcement: updatedRule.enforcement,
    },
  });

  return updatedRule;
}

export async function archivePropertyRuleForCurrentLandlord(
  input: ArchivePropertyRuleInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const existingRule = await getPropertyRuleById(
    supabase,
    input.propertyRuleId,
  );

  if (existingRule.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to archive this property rule.",
      403,
    );
  }

  const archivedRule = await archivePropertyRule(
    supabase,
    input.propertyRuleId,
  );

  await writeAuditLog({
    landlordId: landlord.id,
    propertyId: archivedRule.property_id,
    unitId: archivedRule.unit_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.propertyRuleArchived,
    entityType: AUDIT_ENTITY_TYPES.propertyRule,
    entityId: archivedRule.id,
    description: `Property rule archived: ${archivedRule.title}.`,
    metadata: {
      property_rule_id: archivedRule.id,
      title: archivedRule.title,
      previous_status: existingRule.status,
      current_status: archivedRule.status,
      archived_at: archivedRule.archived_at,
    },
  });

  return archivedRule;
}

export async function getCurrentLandlordPropertyRules(propertyId: string) {
  const landlord = await requireLandlord();

  await assertCurrentLandlordOwnsProperty({
    landlordId: landlord.id,
    propertyId,
  });

  const supabase = await createSupabaseServerClient();

  return getPropertyRulesForProperty(supabase, {
    landlordId: landlord.id,
    propertyId,
  });
}

export async function getCurrentLandlordPropertyRule(propertyRuleId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const propertyRule = await getPropertyRuleById(supabase, propertyRuleId);

  if (propertyRule.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this property rule.",
      403,
    );
  }

  return propertyRule;
}

export async function getPropertyRulesForOnboardingContext(params: {
  propertyId: string;
  unitId?: string | null;
}) {
  const supabase = await createSupabaseServerClient();

  return getActivePropertyRulesForOnboarding(supabase, {
    propertyId: params.propertyId,
    unitId: params.unitId,
  });
}
