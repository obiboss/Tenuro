import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  getManagerOrganizationForCurrentUser,
  getManagerPropertyById,
} from "@/server/repositories/manager.repository";
import { replaceManagerPropertyServiceChargeSettings } from "@/server/repositories/manager-property-settings.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { SaveManagerPropertyServiceChargesInput } from "@/server/validators/manager-property-settings.schema";

function nullableText(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function saveManagerPropertyServiceCharges(
  input: SaveManagerPropertyServiceChargesInput,
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

  return replaceManagerPropertyServiceChargeSettings(
    createSupabaseAdminClient(),
    {
      organizationId: organization.id,
      landlordClientId: property.landlord_client_id,
      propertyId: property.id,
      createdByProfileId: manager.id,
      revisionId: crypto.randomUUID(),
      charges: input.charges.map((charge, index) => ({
        chargeCode: nullableText(charge.chargeCode),
        chargeName: charge.chargeName,
        description: nullableText(charge.description),
        amount: roundMoney(charge.amount),
        chargeBearer: charge.chargeBearer,
        billingCycle: charge.billingCycle,
        isRequiredBeforeMoveIn: charge.isRequiredBeforeMoveIn,
        sortOrder: index,
      })),
    },
  );
}
