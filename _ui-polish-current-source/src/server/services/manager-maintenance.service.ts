import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createManagerMaintenanceRequest as createManagerMaintenanceRequestRecord,
  listManagerMaintenanceRequests as listManagerMaintenanceRequestRecords,
} from "@/server/repositories/manager-maintenance.repository";
import {
  getManagerOrganizationForCurrentUser,
  getManagerPropertyById,
  getManagerTenantById,
  getManagerUnitById,
} from "@/server/repositories/manager.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { CreateManagerMaintenanceRequestInput } from "@/server/validators/manager-maintenance.schema";

type ManagerProfileRow = {
  id: string;
  role: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  is_active: boolean;
};

function nullableText(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function nullableDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getCurrentManagerProfile() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AppError(
      "MANAGER_AUTH_REQUIRED",
      "Please sign in to continue.",
      401,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email, is_active")
    .eq("id", user.id)
    .maybeSingle<ManagerProfileRow>();

  if (profileError) {
    throw profileError;
  }

  if (!profile || !profile.is_active) {
    throw new AppError(
      "MANAGER_PROFILE_NOT_FOUND",
      "We could not find your active BOPA profile.",
      403,
    );
  }

  if (profile.role !== "manager") {
    throw new AppError(
      "MANAGER_ROLE_REQUIRED",
      "This action is only available to BOPA Manager accounts.",
      403,
    );
  }

  return {
    supabase,
    profile,
  };
}

async function requireManagerOrganization() {
  const { supabase, profile } = await getCurrentManagerProfile();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    profile.id,
  );

  if (!organization || organization.status !== "active") {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Create an active BOPA Manager organization before continuing.",
      403,
    );
  }

  return {
    supabase,
    profile,
    organization,
  };
}

export async function createManagerMaintenanceRequest(
  input: CreateManagerMaintenanceRequestInput,
) {
  const { supabase, profile, organization } =
    await requireManagerOrganization();

  const property = await getManagerPropertyById(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
  });

  if (!property || property.status !== "active") {
    throw new AppError(
      "MANAGER_MAINTENANCE_PROPERTY_NOT_FOUND",
      "The selected property could not be found.",
      404,
    );
  }

  if (input.unitId) {
    const unit = await getManagerUnitById(supabase, {
      organizationId: organization.id,
      landlordClientId: input.landlordClientId,
      propertyId: input.propertyId,
      unitId: input.unitId,
    });

    if (!unit || unit.status === "inactive") {
      throw new AppError(
        "MANAGER_MAINTENANCE_UNIT_NOT_FOUND",
        "The selected unit could not be found.",
        404,
      );
    }
  }

  if (input.tenantId) {
    if (!input.unitId) {
      throw new AppError(
        "MANAGER_MAINTENANCE_TENANT_UNIT_REQUIRED",
        "Select the tenant unit before selecting the tenant.",
        400,
      );
    }

    const tenant = await getManagerTenantById(supabase, {
      organizationId: organization.id,
      landlordClientId: input.landlordClientId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      tenantId: input.tenantId,
    });

    if (!tenant) {
      throw new AppError(
        "MANAGER_MAINTENANCE_TENANT_NOT_FOUND",
        "The selected tenant could not be found.",
        404,
      );
    }
  }

  return createManagerMaintenanceRequestRecord(supabase, {
    organizationId: organization.id,
    landlordClientId: input.landlordClientId,
    propertyId: input.propertyId,
    unitId: input.unitId ?? null,
    tenantId: input.tenantId ?? null,
    issueTitle: input.issueTitle,
    issueDescription: nullableText(input.issueDescription),
    priority: input.priority,
    status: input.status,
    estimatedCost: roundMoney(input.estimatedCost),
    actualCost: roundMoney(input.actualCost),
    vendorName: nullableText(input.vendorName),
    reportedDate: input.reportedDate,
    resolvedDate: nullableDate(input.resolvedDate),
    notes: nullableText(input.notes),
    metadata: {
      source: "bopa_manager_manual_maintenance",
    },
    createdByProfileId: profile.id,
  });
}

export async function listManagerMaintenanceRequests() {
  const { supabase, organization } = await requireManagerOrganization();

  return listManagerMaintenanceRequestRecords(supabase, organization.id);
}
