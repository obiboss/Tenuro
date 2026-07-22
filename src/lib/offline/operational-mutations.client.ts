"use client";

import { putOfflineEntity } from "@/lib/offline/entity.repository";
import {
  OfflineFormValidationError,
  queueOfflineFormMutation,
} from "@/lib/offline/offline-form.client";
import {
  calculateCurrentRentCycle,
  calculateCurrentRentDueDate,
  calculateNextRentDueDate,
} from "@/lib/rent-cycle";
import { createManagerMaintenanceRequestSchema } from "@/server/validators/manager-maintenance.schema";
import {
  createManagerLandlordClientSchema,
  createManagerPropertySchema,
  createManagerTenantSchema,
  createManagerUnitSchema,
  recordManagerRentPaymentSchema,
} from "@/server/validators/manager.schema";
import { recordManualPaymentSchema } from "@/server/validators/payment.schema";
import { createPropertySchema } from "@/server/validators/property.schema";
import { createUnitSchema } from "@/server/validators/unit.schema";

const PROPERTY_DRAFT_LANDLORD_ID = "00000000-0000-4000-8000-000000000000";

function getJsonArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
}

function parseOrThrow<T>(result: {
  success: boolean;
  data?: T;
  error?: ConstructorParameters<typeof OfflineFormValidationError>[0];
}) {
  if (!result.success || result.data === undefined) {
    if (result.error) {
      throw new OfflineFormValidationError(result.error);
    }
    throw new Error("Check the form and try again.");
  }
  return result.data;
}

function nullable(value: string | undefined) {
  return value?.trim() || null;
}

function now() {
  return new Date().toISOString();
}

export async function saveManagerPropertyOffline(formData: FormData) {
  const ownerMode = formData.get("ownerMode") === "new" ? "new" : "existing";
  const generatedLandlordId = crypto.randomUUID();
  const property = parseOrThrow(
    createManagerPropertySchema.safeParse({
      landlordClientId:
        ownerMode === "new"
          ? PROPERTY_DRAFT_LANDLORD_ID
          : formData.get("landlordClientId"),
      propertyName: formData.get("propertyName"),
      propertyAddress: formData.get("propertyAddress"),
      city: formData.get("city"),
      state: formData.get("state"),
      lga: formData.get("lga"),
      collectionMode: formData.get("collectionMode"),
      managementFeeType: formData.get("managementFeeType"),
      managementFeeValue: formData.get("managementFeeValue"),
      paystackChargeBearer: formData.get("paystackChargeBearer"),
      paymentReceiver: formData.get("paymentReceiver"),
      hasExistingTenants: formData.get("hasExistingTenants"),
      serviceCharges: getJsonArray(formData.get("serviceChargesJson")),
      propertyRules: getJsonArray(formData.get("propertyRulesJson")),
      notes: formData.get("notes"),
    }),
  );
  const landlord =
    ownerMode === "new"
      ? parseOrThrow(
          createManagerLandlordClientSchema.safeParse({
            landlordName: formData.get("newLandlordName"),
            landlordPhone: formData.get("newLandlordPhone"),
            landlordEmail: formData.get("newLandlordEmail"),
            landlordAddress: formData.get("newLandlordAddress"),
            notes: formData.get("newLandlordNotes"),
          }),
        )
      : null;
  const propertyId = crypto.randomUUID();
  const landlordClientId =
    ownerMode === "new" ? generatedLandlordId : property.landlordClientId;

  const queued = await queueOfflineFormMutation({
    workspaceType: "manager",
    draft: {
      entityType: "manager_property",
      entityId: propertyId,
      payload: {
        ...property,
        landlordClientId,
        ownerMode,
        newLandlord: landlord
          ? { id: generatedLandlordId, ...landlord }
          : null,
        serviceCharges: property.serviceCharges.map((charge) => ({
          id: crypto.randomUUID(),
          ...charge,
        })),
        propertyRules: property.propertyRules.map((rule) => ({
          id: crypto.randomUUID(),
          ...rule,
        })),
      },
      optimisticData: {
        id: propertyId,
        landlord_client_id: landlordClientId,
        property_name: property.propertyName,
        property_address: property.propertyAddress,
        city: nullable(property.city),
        state: nullable(property.state),
        lga: nullable(property.lga),
        collection_mode: property.collectionMode,
        management_fee_type: property.managementFeeType,
        management_fee_value: property.managementFeeValue,
        paystack_charge_bearer: property.paystackChargeBearer,
        payment_receiver: property.paymentReceiver,
        existing_tenant_setup_required: property.hasExistingTenants,
        existing_tenant_setup_completed_at: null,
        existing_tenant_setup_completed_by_profile_id: null,
        status: "active",
        notes: nullable(property.notes),
        offline_landlord_name:
          landlord?.landlordName ??
          (typeof formData.get("existingLandlordName") === "string"
            ? String(formData.get("existingLandlordName"))
            : null),
        created_at: now(),
        updated_at: now(),
      },
    },
  });

  if (landlord) {
    await putOfflineEntity({
      ownerProfileId: queued.ownerProfileId,
      workspaceType: "manager",
      workspaceId: queued.workspaceId,
      entityType: "manager_landlord_client",
      entityId: generatedLandlordId,
      serverRevision: 0,
      serverUpdatedAt: null,
      data: {
        id: generatedLandlordId,
        organization_id: queued.workspaceId,
        landlord_profile_id: null,
        landlord_name: landlord.landlordName,
        landlord_phone: nullable(landlord.landlordPhone),
        landlord_email: nullable(landlord.landlordEmail),
        landlord_address: nullable(landlord.landlordAddress),
        notes: nullable(landlord.notes),
        status: "active",
        created_at: now(),
        updated_at: now(),
        offline_sync_status: "waiting",
        offline_sync_error: null,
        offline_client_mutation_id: queued.clientMutationId,
      },
    });
  }

  return {
    propertyId,
    landlordClientId,
    nextHref: `/manager/properties?pendingProperty=${encodeURIComponent(propertyId)}&tab=units&addUnit=1`,
  };
}

export async function saveManagerUnitOffline(formData: FormData) {
  const unit = parseOrThrow(
    createManagerUnitSchema.safeParse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitLabel: formData.get("unitLabel"),
      unitType: formData.get("unitType"),
      rentFrequency: formData.get("rentFrequency"),
      rentAmount: formData.get("rentAmount"),
      notes: formData.get("notes"),
    }),
  );
  const unitId = crypto.randomUUID();

  await queueOfflineFormMutation({
    workspaceType: "manager",
    draft: {
      entityType: "manager_unit",
      entityId: unitId,
      payload: unit,
      optimisticData: {
        id: unitId,
        property_id: unit.propertyId,
        landlord_client_id: unit.landlordClientId,
        unit_label: unit.unitLabel,
        unit_type: nullable(unit.unitType),
        rent_frequency: unit.rentFrequency,
        rent_amount: unit.rentAmount,
        status: "vacant",
        notes: nullable(unit.notes),
        created_at: now(),
        updated_at: now(),
      },
    },
  });

  return {
    unitId,
    propertyId: unit.propertyId,
    landlordClientId: unit.landlordClientId,
  };
}

export async function saveManagerTenantOffline(formData: FormData) {
  const tenant = parseOrThrow(
    createManagerTenantSchema.safeParse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitId: formData.get("unitId"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      occupation: formData.get("occupation"),
      rentAmount: formData.get("rentAmount"),
      paymentFrequency: formData.get("paymentFrequency"),
      lastPaymentAmount: formData.get("lastPaymentAmount"),
      lastPaymentDate: formData.get("lastPaymentDate"),
      currentBalance: formData.get("currentBalance"),
      moveInDate: formData.get("moveInDate"),
      nextRentDueDate: formData.get("nextRentDueDate"),
      notes: formData.get("notes"),
    }),
  );
  const tenantId = crypto.randomUUID();
  const currentCycle = calculateCurrentRentCycle({
    anchorDate: tenant.moveInDate,
    paymentFrequency: tenant.paymentFrequency,
  });
  const nextRentDueDate = (tenant.currentBalance > 0
    ? calculateCurrentRentDueDate
    : calculateNextRentDueDate)({
    anchorDate: tenant.moveInDate,
    paymentFrequency: tenant.paymentFrequency,
  });

  await queueOfflineFormMutation({
    workspaceType: "manager",
    draft: {
      entityType: "manager_tenant",
      entityId: tenantId,
      payload: tenant,
      optimisticData: {
        id: tenantId,
        landlord_client_id: tenant.landlordClientId,
        property_id: tenant.propertyId,
        unit_id: tenant.unitId,
        full_name: tenant.fullName,
        phone_number: tenant.phoneNumber,
        email: nullable(tenant.email),
        occupation: nullable(tenant.occupation),
        rent_amount: tenant.rentAmount,
        payment_frequency: tenant.paymentFrequency,
        rent_cycle_anchor_date: tenant.moveInDate,
        current_period_start: currentCycle.periodStart,
        current_period_end: currentCycle.periodEnd,
        current_balance: tenant.currentBalance,
        last_payment_amount: tenant.lastPaymentAmount,
        last_payment_date: tenant.lastPaymentDate,
        move_in_date: tenant.moveInDate,
        next_rent_due_date: nextRentDueDate,
        move_out_date: null,
        status: "active",
        notes: nullable(tenant.notes),
        created_at: now(),
        updated_at: now(),
      },
    },
  });

  return { tenantId };
}

export async function saveManagerPaymentOffline(formData: FormData) {
  const payment = parseOrThrow(
    recordManagerRentPaymentSchema.safeParse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitId: formData.get("unitId"),
      tenantId: formData.get("tenantId"),
      amountPaid: formData.get("amountPaid"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReceiver: formData.get("paymentReceiver"),
      paymentReference: formData.get("paymentReference"),
      proofUrl: formData.get("proofUrl"),
      paymentDate: formData.get("paymentDate"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
      notes: formData.get("notes"),
    }),
  );
  const paymentId = crypto.randomUUID();

  await queueOfflineFormMutation({
    workspaceType: "manager",
    draft: {
      entityType: "manager_rent_payment",
      entityId: paymentId,
      payload: payment,
      optimisticData: {
        id: paymentId,
        landlord_client_id: payment.landlordClientId,
        property_id: payment.propertyId,
        unit_id: payment.unitId,
        tenant_id: payment.tenantId,
        collection_mode: "manager_collects",
        payment_receiver: payment.paymentReceiver,
        paystack_charge_bearer: "tenant",
        amount_paid: payment.amountPaid,
        base_rent_amount: payment.amountPaid,
        service_charge_amount: 0,
        service_charge_items_snapshot: [],
        currency_code: "NGN",
        payment_method: payment.paymentMethod,
        payment_reference: nullable(payment.paymentReference),
        payment_date: payment.paymentDate,
        period_start: nullable(payment.periodStart),
        period_end: nullable(payment.periodEnd),
        management_fee_type: "percentage",
        management_fee_value: 0,
        management_fee_amount: 0,
        landlord_net_amount: payment.amountPaid,
        status: "recorded",
        recorded_by_profile_id: null,
        confirmed_by_profile_id: null,
        verified_at: null,
        rejected_at: null,
        reversed_at: null,
        rejection_reason: null,
        notes: nullable(payment.notes),
        metadata: { source: "bopa_manager_local_first" },
        created_at: now(),
        updated_at: now(),
      },
    },
  });

  return { paymentId };
}

export async function saveManagerMaintenanceOffline(formData: FormData) {
  const request = parseOrThrow(
    createManagerMaintenanceRequestSchema.safeParse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitId: formData.get("unitId"),
      tenantId: formData.get("tenantId"),
      issueTitle: formData.get("issueTitle"),
      issueDescription: formData.get("issueDescription"),
      priority: formData.get("priority"),
      status: "reported",
      estimatedCost: formData.get("estimatedCost"),
      actualCost: 0,
      vendorName: "",
      reportedDate: formData.get("reportedDate"),
      resolvedDate: "",
      notes: formData.get("notes"),
    }),
  );
  const requestId = crypto.randomUUID();

  await queueOfflineFormMutation({
    workspaceType: "manager",
    draft: {
      entityType: "manager_maintenance_request",
      entityId: requestId,
      payload: {
        landlordClientId: request.landlordClientId,
        propertyId: request.propertyId,
        unitId: request.unitId ?? null,
        tenantId: request.tenantId ?? null,
        issueTitle: request.issueTitle,
        issueDescription: nullable(request.issueDescription),
        priority: request.priority,
        estimatedCost: request.estimatedCost,
        vendorName: null,
        reportedDate: request.reportedDate,
        notes: nullable(request.notes),
      },
      optimisticData: {
        id: requestId,
        landlord_client_id: request.landlordClientId,
        property_id: request.propertyId,
        unit_id: request.unitId ?? null,
        tenant_id: request.tenantId ?? null,
        issue_title: request.issueTitle,
        issue_description: nullable(request.issueDescription),
        priority: request.priority,
        status: "reported",
        estimated_cost: request.estimatedCost,
        actual_cost: 0,
        vendor_name: null,
        reported_date: request.reportedDate,
        resolved_date: null,
        notes: nullable(request.notes),
        metadata: { source: "bopa_manager_local_first" },
        created_by_profile_id: null,
        updated_by_profile_id: null,
        created_at: now(),
        updated_at: now(),
      },
    },
  });

  return { requestId };
}

export async function saveLandlordPropertyOffline(formData: FormData) {
  const property = parseOrThrow(
    createPropertySchema.safeParse({
      propertyName: formData.get("propertyName"),
      address: formData.get("address"),
      state: formData.get("state"),
      lga: formData.get("lga"),
      propertyType: formData.get("propertyType"),
      countryCode: "NG",
      currencyCode: "NGN",
    }),
  );
  const propertyId = crypto.randomUUID();

  await queueOfflineFormMutation({
    workspaceType: "landlord",
    draft: {
      entityType: "landlord_property",
      entityId: propertyId,
      payload: property,
      optimisticData: {
        id: propertyId,
        property_name: property.propertyName,
        address: property.address,
        state: property.state,
        lga: property.lga,
        property_type: property.propertyType,
        country_code: property.countryCode,
        currency_code: property.currencyCode,
        created_at: now(),
        updated_at: now(),
      },
    },
  });

  return { propertyId };
}

export async function saveLandlordUnitOffline(propertyId: string, formData: FormData) {
  const unit = parseOrThrow(
    createUnitSchema.safeParse({
      propertyId,
      buildingName: formData.get("buildingName"),
      unitIdentifier: formData.get("unitIdentifier"),
      unitType: formData.get("unitType"),
      bedrooms: formData.get("bedrooms"),
      bathrooms: formData.get("bathrooms"),
      rentFrequency: formData.get("rentFrequency"),
      rentAmount: formData.get("rentAmount"),
      monthlyRent: formData.get("monthlyRent") || null,
      annualRent: formData.get("annualRent") || null,
      currencyCode: "NGN",
    }),
  );
  const unitId = crypto.randomUUID();

  await queueOfflineFormMutation({
    workspaceType: "landlord",
    draft: {
      entityType: "landlord_unit",
      entityId: unitId,
      payload: unit,
      optimisticData: {
        id: unitId,
        property_id: unit.propertyId,
        unit_identifier: unit.unitIdentifier,
        unit_type: unit.unitType,
        building_name: nullable(unit.buildingName),
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        rent_frequency: unit.rentFrequency,
        rent_amount: unit.rentAmount,
        monthly_rent: unit.monthlyRent ?? null,
        annual_rent: unit.annualRent ?? null,
        status: "vacant",
        created_at: now(),
        updated_at: now(),
      },
    },
  });

  return { unitId };
}

export async function saveLandlordPaymentOffline(formData: FormData) {
  const payment = parseOrThrow(
    recordManualPaymentSchema.safeParse({
      tenancyId: formData.get("tenancyId"),
      amountPaid: formData.get("amountPaid"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReference: formData.get("paymentReference"),
      paymentDate: formData.get("paymentDate"),
      paymentForPeriodStart: formData.get("paymentForPeriodStart") || undefined,
      paymentForPeriodEnd: formData.get("paymentForPeriodEnd") || undefined,
      notes: formData.get("notes"),
      idempotencyKey: formData.get("idempotencyKey") || crypto.randomUUID(),
    }),
  );
  const paymentId = crypto.randomUUID();

  await queueOfflineFormMutation({
    workspaceType: "landlord",
    draft: {
      entityType: "landlord_rent_payment",
      entityId: paymentId,
      payload: {
        ...payment,
        paymentDate: payment.paymentDate.toISOString(),
        paymentForPeriodStart:
          payment.paymentForPeriodStart?.toISOString() ?? null,
        paymentForPeriodEnd:
          payment.paymentForPeriodEnd?.toISOString() ?? null,
      },
      optimisticData: {
        id: paymentId,
        tenancy_id: payment.tenancyId,
        amount_paid: payment.amountPaid,
        payment_method: payment.paymentMethod,
        payment_reference: nullable(payment.paymentReference),
        payment_date: payment.paymentDate.toISOString(),
        status: "waiting_to_sync",
        created_at: now(),
        updated_at: now(),
      },
    },
  });

  return { paymentId };
}
