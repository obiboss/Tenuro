import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  getManagerOrganizationForCurrentUser,
  getManagerPropertyById,
} from "@/server/repositories/manager.repository";
import { replaceManagerPropertyTenantRequirements } from "@/server/repositories/manager-property-requirements.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { SaveManagerPropertyTenantRequirementsInput } from "@/server/validators/manager-property-requirements.schema";

function nullableText(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function saveManagerPropertyTenantRequirements(
  input: SaveManagerPropertyTenantRequirementsInput,
) {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization || organization.status !== "active") {
    throw new AppError(
      "MANAGER_ORGANIZATION_NOT_FOUND",
      "Your manager workspace could not be found.",
      404,
    );
  }

  const property = await getManagerPropertyById(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
  });

  if (!property || property.status !== "active") {
    throw new AppError(
      "MANAGER_PROPERTY_NOT_FOUND",
      "The selected property could not be found.",
      404,
    );
  }

  return replaceManagerPropertyTenantRequirements(
    createSupabaseAdminClient(),
    {
      organizationId: organization.id,
      landlordClientId: property.landlord_client_id,
      propertyId: property.id,
      createdByProfileId: manager.id,
      revisionId: crypto.randomUUID(),
      requirements: input.requirements.map(
        (requirement, index) => ({
          requirementCode: requirement.requirementCode,
          title: requirement.title,
          questionText: requirement.questionText,
          description: nullableText(requirement.description),
          answerType: requirement.answerType,
          expectedBoolean:
            requirement.expectedBoolean ?? null,
          minimumValue: requirement.minimumValue ?? null,
          maximumValue: requirement.maximumValue ?? null,
          requiredGuarantorCount:
            requirement.requiredGuarantorCount ?? null,
          mismatchAction: requirement.mismatchAction,
          includeInAgreement: requirement.includeInAgreement,
          agreementClause: nullableText(
            requirement.agreementClause,
          ),
          sortOrder: index,
        }),
      ),
    },
  );
}
