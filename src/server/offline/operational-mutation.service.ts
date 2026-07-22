import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OfflineSafeMutationEntity,
  OfflineSafeMutationResult,
} from "@/lib/offline/safe-mutation.types";
import { recordManualPaymentForCurrentLandlord } from "@/server/services/payments.service";
import type { OfflineSafeMutationInput } from "@/server/validators/offline-safe-mutation.schema";

export type OfflineOperationalMutation = Extract<
  OfflineSafeMutationInput,
  {
    operation: "create";
    entityType:
      | "manager_property"
      | "manager_unit"
      | "manager_tenant"
      | "manager_rent_payment"
      | "landlord_property"
      | "landlord_unit"
      | "landlord_rent_payment";
  }
>;

type OperationalWorkspace = {
  profileId: string;
  workspaceType: "manager" | "landlord";
  workspaceId: string;
};

function isOperationalMutation(
  mutation: OfflineSafeMutationInput,
): mutation is OfflineOperationalMutation {
  return (
    mutation.operation === "create" &&
    [
      "manager_property",
      "manager_unit",
      "manager_tenant",
      "manager_rent_payment",
      "landlord_property",
      "landlord_unit",
      "landlord_rent_payment",
    ].includes(mutation.entityType)
  );
}

export { isOperationalMutation };

function toRevision(updatedAt: string | undefined, createdAt: string | undefined) {
  return Date.parse(updatedAt ?? createdAt ?? "") || Date.now();
}

function toEntity(
  mutation: OfflineOperationalMutation,
  row: Record<string, unknown>,
  entityId = mutation.entityId,
): OfflineSafeMutationEntity {
  const updatedAt =
    typeof row.updated_at === "string"
      ? row.updated_at
      : typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString();

  return {
    entityType: mutation.entityType,
    entityId,
    serverRevision: toRevision(
      typeof row.updated_at === "string" ? row.updated_at : undefined,
      typeof row.created_at === "string" ? row.created_at : undefined,
    ),
    updatedAt,
    deletedAt: null,
    data: row,
  };
}

function rejected(
  mutation: OfflineOperationalMutation,
  code: string,
  message: string,
): OfflineSafeMutationResult {
  return {
    clientMutationId: mutation.clientMutationId,
    status: "rejected",
    code,
    message,
  };
}

async function loadById(
  supabase: SupabaseClient,
  table: string,
  id: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    throw error;
  }

  return data;
}

async function insertStableRow(input: {
  supabase: SupabaseClient;
  table: string;
  id: string;
  payload: Record<string, unknown>;
}) {
  const { data, error } = await input.supabase
    .from(input.table)
    .insert({ id: input.id, ...input.payload })
    .select("*")
    .single<Record<string, unknown>>();

  if (!error) {
    return data;
  }

  if (error.code === "23505") {
    const existing = await loadById(input.supabase, input.table, input.id);

    if (existing) {
      return existing;
    }
  }

  throw error;
}

function assertStableRowMatches(
  row: Record<string, unknown>,
  expected: Record<string, string>,
) {
  const matches = Object.entries(expected).every(
    ([key, value]) => String(row[key] ?? "") === value,
  );

  if (!matches) {
    throw Object.assign(
      new Error("The offline record identifier is already in use."),
      { code: "23505" },
    );
  }
}

function normaliseComparableText(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normaliseComparablePhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").replace(/^234/, "0");
}

function managerTenantMatchesQueuedPayload(
  row: Record<string, unknown>,
  payload: Extract<
    OfflineOperationalMutation,
    { entityType: "manager_tenant" }
  >["payload"],
) {
  return (
    normaliseComparableText(row.full_name) ===
      normaliseComparableText(payload.fullName) &&
    normaliseComparablePhone(row.phone_number) ===
      normaliseComparablePhone(payload.phoneNumber) &&
    String(row.move_in_date ?? "") === String(payload.moveInDate)
  );
}

async function saveManagerTenantOpeningPaymentSnapshot(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    tenantId: string;
    lastPaymentAmount: number | null;
    lastPaymentDate: string | null;
    fallbackTenant: Record<string, unknown>;
  },
) {
  if (params.lastPaymentAmount === null || !params.lastPaymentDate) {
    return params.fallbackTenant;
  }

  const { data, error } = await supabase
    .from("manager_tenants")
    .update({
      last_payment_amount: params.lastPaymentAmount,
      last_payment_date: params.lastPaymentDate,
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.tenantId)
    .select("*")
    .single<Record<string, unknown>>();

  if (error) {
    throw error;
  }

  return data;
}

async function applyManagerProperty(
  supabase: SupabaseClient,
  workspace: OperationalWorkspace,
  mutation: Extract<OfflineOperationalMutation, { entityType: "manager_property" }>,
) {
  const payload = mutation.payload;

  if (payload.ownerMode === "new" && payload.newLandlord) {
    await insertStableRow({
      supabase,
      table: "manager_landlord_clients",
      id: payload.newLandlord.id,
      payload: {
        organization_id: workspace.workspaceId,
        landlord_name: payload.newLandlord.landlordName,
        landlord_phone: payload.newLandlord.landlordPhone,
        landlord_email: payload.newLandlord.landlordEmail,
        landlord_address: payload.newLandlord.landlordAddress,
        notes: payload.newLandlord.notes,
        status: "active",
      },
    });
  }

  const { data: landlord } = await supabase
    .from("manager_landlord_clients")
    .select("id")
    .eq("id", payload.landlordClientId)
    .eq("organization_id", workspace.workspaceId)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!landlord) {
    return rejected(
      mutation,
      "OFFLINE_LANDLORD_NOT_FOUND",
      "The selected landlord is no longer available.",
    );
  }

  const property = await insertStableRow({
    supabase,
    table: "manager_properties",
    id: mutation.entityId,
    payload: {
      organization_id: workspace.workspaceId,
      landlord_client_id: payload.landlordClientId,
      property_name: payload.propertyName,
      property_address: payload.propertyAddress,
      city: payload.city,
      state: payload.state,
      lga: payload.lga,
      collection_mode: payload.collectionMode,
      management_fee_type: payload.managementFeeType,
      management_fee_value: payload.managementFeeValue,
      paystack_charge_bearer: payload.paystackChargeBearer,
      payment_receiver: payload.paymentReceiver,
      existing_tenant_setup_required: payload.hasExistingTenants,
      existing_tenant_setup_completed_at: null,
      existing_tenant_setup_completed_by_profile_id: null,
      notes: payload.notes,
      status: "active",
    },
  });
  assertStableRowMatches(property, {
    organization_id: workspace.workspaceId,
    landlord_client_id: payload.landlordClientId,
  });

  if (payload.serviceCharges.length > 0) {
    const { error } = await supabase
      .from("manager_property_service_charges")
      .upsert(
        payload.serviceCharges.map((charge, index) => ({
          id: charge.id,
          organization_id: workspace.workspaceId,
          landlord_client_id: payload.landlordClientId,
          property_id: mutation.entityId,
          charge_code: charge.chargeCode,
          charge_name: charge.chargeName,
          description: charge.description,
          amount: charge.amount,
          currency_code: "NGN",
          status: "active",
          is_required_before_move_in: charge.isRequiredBeforeMoveIn,
          sort_order: index,
          created_by_profile_id: workspace.profileId,
          metadata: {
            source: "bopa_manager_offline_property_onboarding",
            offline_client_mutation_id: mutation.clientMutationId,
          },
        })),
        { onConflict: "id", ignoreDuplicates: true },
      );

    if (error) {
      throw error;
    }
  }

  if (payload.propertyRules.length > 0) {
    const { error } = await supabase
      .from("manager_property_rules")
      .upsert(
        payload.propertyRules.map((rule, index) => ({
          id: rule.id,
          organization_id: workspace.workspaceId,
          landlord_client_id: payload.landlordClientId,
          property_id: mutation.entityId,
          title: rule.title,
          description: rule.description,
          category: rule.category,
          enforcement: "information_only",
          applies_to: rule.appliesTo,
          status: "active",
          requires_tenant_acknowledgement:
            rule.requiresTenantAcknowledgement,
          sort_order: index,
          created_by_profile_id: workspace.profileId,
          metadata: {
            source: "bopa_manager_offline_property_onboarding",
            offline_client_mutation_id: mutation.clientMutationId,
          },
        })),
        { onConflict: "id", ignoreDuplicates: true },
      );

    if (error) {
      throw error;
    }
  }

  return {
    clientMutationId: mutation.clientMutationId,
    status: "applied" as const,
    entity: toEntity(mutation, property),
  };
}

async function applyManagerUnit(
  supabase: SupabaseClient,
  workspace: OperationalWorkspace,
  mutation: Extract<OfflineOperationalMutation, { entityType: "manager_unit" }>,
) {
  const payload = mutation.payload;
  const { data: property } = await supabase
    .from("manager_properties")
    .select("id")
    .eq("id", payload.propertyId)
    .eq("organization_id", workspace.workspaceId)
    .eq("landlord_client_id", payload.landlordClientId)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!property) {
    return rejected(
      mutation,
      "OFFLINE_PROPERTY_NOT_FOUND",
      "The selected property is no longer available.",
    );
  }

  const unit = await insertStableRow({
    supabase,
    table: "manager_units",
    id: mutation.entityId,
    payload: {
      organization_id: workspace.workspaceId,
      landlord_client_id: payload.landlordClientId,
      property_id: payload.propertyId,
      unit_label: payload.unitLabel,
      unit_type: payload.unitType,
      rent_frequency: payload.rentFrequency,
      rent_amount: payload.rentAmount,
      status: "vacant",
      notes: payload.notes,
    },
  });
  assertStableRowMatches(unit, {
    organization_id: workspace.workspaceId,
    property_id: payload.propertyId,
  });

  return {
    clientMutationId: mutation.clientMutationId,
    status: "applied" as const,
    entity: toEntity(mutation, unit),
  };
}

async function applyManagerTenant(
  supabase: SupabaseClient,
  workspace: OperationalWorkspace,
  mutation: Extract<OfflineOperationalMutation, { entityType: "manager_tenant" }>,
) {
  const payload = mutation.payload;
  const { data: existingTenant, error: existingTenantError } = await supabase
    .from("manager_tenants")
    .select("*")
    .eq("organization_id", workspace.workspaceId)
    .eq("unit_id", payload.unitId)
    .in("status", ["active", "eviction_notice"])
    .is("move_out_date", null)
    .maybeSingle<Record<string, unknown>>();

  if (existingTenantError) {
    throw existingTenantError;
  }

  if (existingTenant) {
    if (managerTenantMatchesQueuedPayload(existingTenant, payload)) {
      const tenantWithPaymentSnapshot =
        await saveManagerTenantOpeningPaymentSnapshot(supabase, {
          organizationId: workspace.workspaceId,
          tenantId: String(existingTenant.id),
          lastPaymentAmount: payload.lastPaymentAmount,
          lastPaymentDate: payload.lastPaymentDate,
          fallbackTenant: existingTenant,
        });

      return {
        clientMutationId: mutation.clientMutationId,
        status: "duplicate" as const,
        entity: toEntity(
          mutation,
          tenantWithPaymentSnapshot,
          String(existingTenant.id),
        ),
      };
    }

    return {
      clientMutationId: mutation.clientMutationId,
      status: "conflict" as const,
      code: "OFFLINE_CONFLICT" as const,
      message:
        "This unit already has a different current tenant. The saved record was not applied.",
      serverEntity: toEntity(
        mutation,
        existingTenant,
        String(existingTenant.id),
      ),
    };
  }

  const { data, error } = await supabase.rpc(
    "create_manager_existing_tenant_offline",
    {
      p_profile_id: workspace.profileId,
      p_organization_id: workspace.workspaceId,
      p_tenant_id: mutation.entityId,
      p_landlord_client_id: payload.landlordClientId,
      p_property_id: payload.propertyId,
      p_unit_id: payload.unitId,
      p_full_name: payload.fullName,
      p_phone_number: payload.phoneNumber,
      p_email: payload.email,
      p_occupation: payload.occupation,
      p_rent_amount: payload.rentAmount,
      p_current_balance: payload.currentBalance,
      p_move_in_date: payload.moveInDate,
      p_next_rent_due_date: payload.nextRentDueDate,
      p_notes: payload.notes,
      p_client_mutation_id: mutation.clientMutationId,
    },
  );

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The tenant could not be confirmed after syncing.");
  }

  const createdTenant = data as Record<string, unknown>;
  const tenantWithPaymentSnapshot =
    await saveManagerTenantOpeningPaymentSnapshot(supabase, {
      organizationId: workspace.workspaceId,
      tenantId: String(createdTenant.id ?? mutation.entityId),
      lastPaymentAmount: payload.lastPaymentAmount,
      lastPaymentDate: payload.lastPaymentDate,
      fallbackTenant: createdTenant,
    });

  return {
    clientMutationId: mutation.clientMutationId,
    status: "applied" as const,
    entity: toEntity(mutation, tenantWithPaymentSnapshot),
  };
}

async function applyManagerPayment(
  supabase: SupabaseClient,
  workspace: OperationalWorkspace,
  mutation: Extract<OfflineOperationalMutation, { entityType: "manager_rent_payment" }>,
) {
  const payload = mutation.payload;
  const [{ data: property }, { data: unit }, { data: tenant }] =
    await Promise.all([
      supabase
        .from("manager_properties")
        .select("*")
        .eq("id", payload.propertyId)
        .eq("organization_id", workspace.workspaceId)
        .eq("landlord_client_id", payload.landlordClientId)
        .eq("status", "active")
        .maybeSingle<Record<string, unknown>>(),
      supabase
        .from("manager_units")
        .select("id, status")
        .eq("id", payload.unitId)
        .eq("organization_id", workspace.workspaceId)
        .eq("property_id", payload.propertyId)
        .maybeSingle<{ id: string; status: string }>(),
      supabase
        .from("manager_tenants")
        .select("id, status")
        .eq("id", payload.tenantId)
        .eq("organization_id", workspace.workspaceId)
        .eq("unit_id", payload.unitId)
        .maybeSingle<{ id: string; status: string }>(),
    ]);

  if (!property || !unit || unit.status === "inactive" || !tenant) {
    return rejected(
      mutation,
      "OFFLINE_PAYMENT_CONTEXT_CHANGED",
      "The selected property, unit, or tenant is no longer available.",
    );
  }

  if (!["active", "eviction_notice"].includes(tenant.status)) {
    return rejected(
      mutation,
      "OFFLINE_TENANT_NOT_CURRENT",
      "The selected tenant is no longer current.",
    );
  }

  const feeType = String(property.management_fee_type);
  const feeValue = Number(property.management_fee_value);
  const managerCommission =
    feeType === "percentage"
      ? Math.round(payload.amountPaid * feeValue) / 100
      : Math.min(feeValue, payload.amountPaid);
  const landlordShare =
    Math.round((payload.amountPaid - managerCommission) * 100) / 100;
  const collectionMode = String(property.collection_mode);
  const status =
    collectionMode === "manager_collects" &&
    payload.paymentReceiver === "manager"
      ? "recorded"
      : "pending_confirmation";

  const payment = await insertStableRow({
    supabase,
    table: "manager_rent_payments",
    id: mutation.entityId,
    payload: {
      organization_id: workspace.workspaceId,
      landlord_client_id: payload.landlordClientId,
      property_id: payload.propertyId,
      unit_id: payload.unitId,
      tenant_id: payload.tenantId,
      collection_mode: collectionMode,
      payment_receiver: payload.paymentReceiver,
      paystack_charge_bearer: property.paystack_charge_bearer,
      amount_paid: payload.amountPaid,
      base_rent_amount: payload.amountPaid,
      service_charge_amount: 0,
      service_charge_items_snapshot: [],
      currency_code: "NGN",
      payment_method: payload.paymentMethod,
      payment_reference: payload.paymentReference,
      payment_date: payload.paymentDate,
      period_start: payload.periodStart,
      period_end: payload.periodEnd,
      management_fee_type: feeType,
      management_fee_value: feeValue,
      management_fee_amount: managerCommission,
      landlord_net_amount: landlordShare,
      status,
      recorded_by_profile_id: workspace.profileId,
      notes: payload.notes,
      metadata: {
        source: "bopa_manager_offline_payment",
        proof_url: payload.proofUrl,
        offline_client_mutation_id: mutation.clientMutationId,
        manager_commission: managerCommission,
        landlord_share: landlordShare,
      },
    },
  });
  assertStableRowMatches(payment, {
    organization_id: workspace.workspaceId,
    tenant_id: payload.tenantId,
  });

  return {
    clientMutationId: mutation.clientMutationId,
    status: "applied" as const,
    entity: toEntity(mutation, payment),
  };
}

async function applyLandlordProperty(
  supabase: SupabaseClient,
  workspace: OperationalWorkspace,
  mutation: Extract<OfflineOperationalMutation, { entityType: "landlord_property" }>,
) {
  const payload = mutation.payload;
  const property = await insertStableRow({
    supabase,
    table: "properties",
    id: mutation.entityId,
    payload: {
      landlord_id: workspace.profileId,
      property_name: payload.propertyName,
      address: payload.address,
      state: payload.state,
      lga: payload.lga,
      property_type: payload.propertyType,
      country_code: payload.countryCode,
      currency_code: payload.currencyCode,
    },
  });
  assertStableRowMatches(property, {
    landlord_id: workspace.profileId,
  });

  return {
    clientMutationId: mutation.clientMutationId,
    status: "applied" as const,
    entity: toEntity(mutation, property),
  };
}

async function applyLandlordUnit(
  supabase: SupabaseClient,
  workspace: OperationalWorkspace,
  mutation: Extract<OfflineOperationalMutation, { entityType: "landlord_unit" }>,
) {
  const payload = mutation.payload;
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", payload.propertyId)
    .eq("landlord_id", workspace.profileId)
    .is("deleted_at", null)
    .maybeSingle<{ id: string }>();

  if (!property) {
    return rejected(
      mutation,
      "OFFLINE_PROPERTY_NOT_FOUND",
      "The selected property is no longer available.",
    );
  }

  const unit = await insertStableRow({
    supabase,
    table: "units",
    id: mutation.entityId,
    payload: {
      property_id: payload.propertyId,
      building_name: payload.buildingName,
      unit_identifier: payload.unitIdentifier,
      unit_type: payload.unitType,
      bedrooms: payload.bedrooms,
      bathrooms: payload.bathrooms,
      rent_frequency: payload.rentFrequency,
      rent_amount: payload.rentAmount,
      monthly_rent: payload.monthlyRent,
      annual_rent: payload.annualRent,
      currency_code: payload.currencyCode,
      status: "vacant",
    },
  });
  assertStableRowMatches(unit, {
    property_id: payload.propertyId,
  });

  return {
    clientMutationId: mutation.clientMutationId,
    status: "applied" as const,
    entity: toEntity(mutation, unit),
  };
}

async function applyLandlordPayment(
  supabase: SupabaseClient,
  mutation: Extract<OfflineOperationalMutation, { entityType: "landlord_rent_payment" }>,
) {
  const payload = mutation.payload;
  const result = await recordManualPaymentForCurrentLandlord({
    tenancyId: payload.tenancyId,
    amountPaid: payload.amountPaid,
    paymentMethod: payload.paymentMethod,
    paymentReference: payload.paymentReference ?? "",
    paymentDate: new Date(payload.paymentDate),
    paymentForPeriodStart: payload.paymentForPeriodStart
      ? new Date(payload.paymentForPeriodStart)
      : undefined,
    paymentForPeriodEnd: payload.paymentForPeriodEnd
      ? new Date(payload.paymentForPeriodEnd)
      : undefined,
    notes: payload.notes ?? "",
    idempotencyKey: payload.idempotencyKey,
  });
  const payment = await loadById(supabase, "rent_payments", result.paymentId);

  if (!payment) {
    throw new Error("The payment could not be confirmed after syncing.");
  }

  return {
    clientMutationId: mutation.clientMutationId,
    status: "applied" as const,
    entity: toEntity(mutation, payment, result.paymentId),
  };
}

export async function applyOfflineOperationalMutation(input: {
  supabase: SupabaseClient;
  workspace: OperationalWorkspace;
  mutation: OfflineOperationalMutation;
}): Promise<OfflineSafeMutationResult> {
  const { mutation, supabase, workspace } = input;

  switch (mutation.entityType) {
    case "manager_property":
      return applyManagerProperty(supabase, workspace, mutation);
    case "manager_unit":
      return applyManagerUnit(supabase, workspace, mutation);
    case "manager_tenant":
      return applyManagerTenant(supabase, workspace, mutation);
    case "manager_rent_payment":
      return applyManagerPayment(supabase, workspace, mutation);
    case "landlord_property":
      return applyLandlordProperty(supabase, workspace, mutation);
    case "landlord_unit":
      return applyLandlordUnit(supabase, workspace, mutation);
    case "landlord_rent_payment":
      return applyLandlordPayment(supabase, mutation);
    default:
      throw new Error("This offline operation is not supported.");
  }
}
