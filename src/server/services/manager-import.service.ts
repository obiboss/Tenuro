import "server-only";

import crypto from "node:crypto";
import { normalisePhoneNumber, tryNormalisePhoneNumber } from "@/lib/phone";
import {
  managerImportRowSchema,
  type ManagerImportIssue,
  type ManagerImportResult,
  type ManagerImportRow,
} from "@/lib/manager-import";
import {
  createManagerLandlordClient,
  createManagerProperty,
  createManagerUnit,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
  recordManagerRentPayment,
  type ManagerLandlordClientRow,
  type ManagerPropertyRow,
  type ManagerTenantRow,
  type ManagerUnitRow,
} from "@/server/repositories/manager.repository";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";

type PaymentIdentity = {
  tenant_id: string;
  payment_date: string;
  amount_paid: number;
  payment_reference: string | null;
};

function key(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function sameMoney(left: number, right: number) {
  return Math.abs(Number(left) - Number(right)) < 0.01;
}

function nullableText(value: string | null) {
  return value?.trim() || null;
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "The row could not be saved.";
}

function findLandlord(
  landlords: ManagerLandlordClientRow[],
  row: ManagerImportRow,
) {
  const nameMatches = landlords.filter(
    (landlord) => key(landlord.landlord_name) === key(row.landlordName),
  );

  if (nameMatches.length <= 1) {
    return nameMatches[0] ?? null;
  }

  const phone = tryNormalisePhoneNumber(row.landlordPhone)?.e164;
  const email = key(row.landlordEmail);
  const precise = nameMatches.filter((landlord) => {
    const existingPhone = tryNormalisePhoneNumber(
      landlord.landlord_phone,
    )?.e164;
    return (
      (phone && existingPhone === phone) ||
      (email && key(landlord.landlord_email) === email)
    );
  });

  if (precise.length === 1) {
    return precise[0];
  }

  throw new Error(
    "More than one landlord has this name. Add the landlord phone or email so BOPA can select the correct record.",
  );
}

function findProperty(
  properties: ManagerPropertyRow[],
  landlordId: string,
  row: ManagerImportRow,
) {
  return (
    properties.find(
      (property) =>
        property.landlord_client_id === landlordId &&
        key(property.property_name) === key(row.propertyName) &&
        key(property.property_address) === key(row.propertyAddress),
    ) ?? null
  );
}

function findUnit(
  units: ManagerUnitRow[],
  propertyId: string,
  unitLabel: string,
) {
  return (
    units.find(
      (unit) =>
        unit.property_id === propertyId &&
        key(unit.unit_label) === key(unitLabel),
    ) ?? null
  );
}

function findCurrentTenant(tenants: ManagerTenantRow[], unitId: string) {
  return tenants.find((tenant) => tenant.unit_id === unitId) ?? null;
}

function paymentAlreadyExists(
  payments: PaymentIdentity[],
  params: {
    tenantId: string;
    date: string;
    amount: number;
    reference: string | null;
  },
) {
  const referenceKey = key(params.reference);

  return payments.some((payment) => {
    if (referenceKey && key(payment.payment_reference) === referenceKey) {
      return true;
    }

    return (
      payment.tenant_id === params.tenantId &&
      payment.payment_date === params.date &&
      sameMoney(payment.amount_paid, params.amount)
    );
  });
}

function calculatePaymentShares(row: ManagerImportRow, amount: number) {
  const commission =
    row.managementFeeType === "percentage"
      ? (amount * row.managementFeeValue) / 100
      : Math.min(row.managementFeeValue, amount);
  const managerCommission = Math.round(commission * 100) / 100;

  return {
    managerCommission,
    landlordShare: Math.round((amount - managerCommission) * 100) / 100,
  };
}

function propertySettingsMatch(
  property: ManagerPropertyRow,
  row: ManagerImportRow,
) {
  return (
    property.collection_mode === row.collectionMode &&
    property.management_fee_type === row.managementFeeType &&
    sameMoney(property.management_fee_value, row.managementFeeValue) &&
    property.paystack_charge_bearer === row.paystackChargeBearer &&
    property.payment_receiver === row.paymentReceiver
  );
}

export async function importManagerRows(
  rawRows: unknown,
): Promise<ManagerImportResult> {
  const parsedRows = Array.isArray(rawRows)
    ? rawRows.map((row) => managerImportRowSchema.parse(row))
    : [];

  if (parsedRows.length === 0 || parsedRows.length > 500) {
    throw new Error("Import between 1 and 500 checked rows at a time.");
  }

  const { manager, access } =
    await requireManagerWorkspacePermission("records.import");
  const organizationId = access.organization.id;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const [landlords, properties, units, tenants, paymentResponse] =
    await Promise.all([
      listManagerLandlordClients(supabase, organizationId),
      listManagerProperties(supabase, organizationId),
      listManagerUnits(supabase, { organizationId }),
      listManagerTenants(supabase, { organizationId }),
      admin
        .from("manager_rent_payments")
        .select("tenant_id,payment_date,amount_paid,payment_reference")
        .eq("organization_id", organizationId)
        .returns<PaymentIdentity[]>(),
    ]);

  if (paymentResponse.error) {
    throw paymentResponse.error;
  }

  const payments = paymentResponse.data ?? [];
  const issues: ManagerImportIssue[] = [];
  const created = {
    landlords: 0,
    properties: 0,
    units: 0,
    tenants: 0,
    payments: 0,
  };
  let reused = 0;
  let skippedPayments = 0;

  for (const row of parsedRows) {
    try {
      let landlord = findLandlord(landlords, row);

      if (!landlord) {
        landlord = await createManagerLandlordClient(supabase, {
          organizationId,
          landlordName: row.landlordName,
          landlordPhone: nullableText(row.landlordPhone),
          landlordEmail: nullableText(row.landlordEmail),
          landlordAddress: nullableText(row.landlordAddress),
          notes: "Imported from an existing records spreadsheet.",
        });
        landlords.push(landlord);
        created.landlords += 1;
      } else {
        reused += 1;
      }

      let property = findProperty(properties, landlord.id, row);

      if (property && !propertySettingsMatch(property, row)) {
        throw new Error(
          "This property already exists with different rent collection or management fee settings. Correct the spreadsheet or update the property in BOPA first.",
        );
      }

      if (!property) {
        property = await createManagerProperty(supabase, {
          organizationId,
          landlordClientId: landlord.id,
          propertyName: row.propertyName,
          propertyAddress: row.propertyAddress,
          city: nullableText(row.city),
          state: nullableText(row.state),
          lga: nullableText(row.lga),
          collectionMode: row.collectionMode,
          managementFeeType: row.managementFeeType,
          managementFeeValue: row.managementFeeValue,
          paystackChargeBearer: row.paystackChargeBearer,
          paymentReceiver: row.paymentReceiver,
          hasExistingTenants: false,
          notes: "Imported from an existing records spreadsheet.",
        });
        properties.push(property);
        created.properties += 1;
      } else {
        reused += 1;
      }

      let unit = findUnit(units, property.id, row.unitLabel);

      if (unit && !sameMoney(unit.rent_amount, row.rentAmount)) {
        throw new Error(
          "This unit already exists with a different rent amount. Correct the spreadsheet or update the unit in BOPA first.",
        );
      }

      if (!unit) {
        unit = await createManagerUnit(supabase, {
          organizationId,
          landlordClientId: landlord.id,
          propertyId: property.id,
          unitLabel: row.unitLabel,
          unitType: nullableText(row.unitType),
          rentAmount: row.rentAmount,
          status: "vacant",
          notes: "Imported from an existing records spreadsheet.",
        });
        units.push(unit);
        created.units += 1;
      } else {
        reused += 1;
      }

      if (!row.tenantName) {
        continue;
      }

      const normalisedTenantPhone = normalisePhoneNumber(row.tenantPhone ?? "");
      let tenant = findCurrentTenant(tenants, unit.id);

      if (tenant) {
        const existingPhone = normalisePhoneNumber(tenant.phone_number).e164;
        if (existingPhone !== normalisedTenantPhone.e164) {
          throw new Error(
            `Unit ${unit.unit_label} already has ${tenant.full_name} as its current tenant. Move that tenant out or correct the spreadsheet before importing this row.`,
          );
        }
        reused += 1;
      } else {
        const tenantId = crypto.randomUUID();
        const { error } = await admin.rpc(
          "create_manager_existing_tenant_offline",
          {
            p_profile_id: manager.id,
            p_organization_id: organizationId,
            p_tenant_id: tenantId,
            p_landlord_client_id: landlord.id,
            p_property_id: property.id,
            p_unit_id: unit.id,
            p_full_name: row.tenantName,
            p_phone_number: normalisedTenantPhone.e164,
            p_email: nullableText(row.tenantEmail),
            p_occupation: nullableText(row.occupation),
            p_rent_amount: row.rentAmount,
            p_current_balance: row.currentBalance,
            p_move_in_date: row.moveInDate,
            p_next_rent_due_date: row.nextRentDueDate,
            p_notes: "Imported from an existing records spreadsheet.",
            p_client_mutation_id: crypto.randomUUID(),
          },
        );

        if (error) {
          throw error;
        }

        tenant = {
          id: tenantId,
          organization_id: organizationId,
          landlord_client_id: landlord.id,
          property_id: property.id,
          unit_id: unit.id,
          full_name: row.tenantName,
          phone_number: normalisedTenantPhone.e164,
          email: row.tenantEmail,
          occupation: row.occupation,
          rent_amount: row.rentAmount,
          current_balance: row.currentBalance,
          move_in_date: row.moveInDate,
          next_rent_due_date: row.nextRentDueDate,
          move_out_date: null,
          status: "active",
          notes: "Imported from an existing records spreadsheet.",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        tenants.push(tenant);
        created.tenants += 1;
      }

      if (row.lastPaymentAmount === null || !row.lastPaymentDate) {
        continue;
      }

      if (
        paymentAlreadyExists(payments, {
          tenantId: tenant.id,
          date: row.lastPaymentDate,
          amount: row.lastPaymentAmount,
          reference: row.paymentReference,
        })
      ) {
        skippedPayments += 1;
        continue;
      }

      const shares = calculatePaymentShares(row, row.lastPaymentAmount);
      const status =
        row.collectionMode === "manager_collects" &&
        row.paymentReceiver === "manager"
          ? "recorded"
          : "pending_confirmation";

      await recordManagerRentPayment(supabase, {
        organizationId,
        landlordClientId: landlord.id,
        propertyId: property.id,
        unitId: unit.id,
        tenantId: tenant.id,
        collectionMode: row.collectionMode,
        paymentReceiver: row.paymentReceiver,
        paystackChargeBearer: row.paystackChargeBearer,
        amountPaid: row.lastPaymentAmount,
        baseRentAmount: row.lastPaymentAmount,
        serviceChargeAmount: 0,
        serviceChargeItemsSnapshot: [],
        paymentMethod: row.paymentMethod ?? "other",
        paymentReference: nullableText(row.paymentReference),
        paymentDate: row.lastPaymentDate,
        periodStart: null,
        periodEnd: null,
        managementFeeType: row.managementFeeType,
        managementFeeValue: row.managementFeeValue,
        managementFeeAmount: shares.managerCommission,
        landlordNetAmount: shares.landlordShare,
        status,
        recordedByProfileId: manager.id,
        notes: "Imported from an existing records spreadsheet.",
        metadata: {
          source: "bopa_manager_excel_import",
          import_row_number: row.rowNumber,
          manager_commission: shares.managerCommission,
          landlord_share: shares.landlordShare,
        },
      });
      payments.push({
        tenant_id: tenant.id,
        payment_date: row.lastPaymentDate,
        amount_paid: row.lastPaymentAmount,
        payment_reference: row.paymentReference,
      });
      created.payments += 1;
    } catch (error) {
      issues.push({ rowNumber: row.rowNumber, message: errorMessage(error) });
    }
  }

  const completedRows = parsedRows.length - issues.length;

  return {
    ok: issues.length === 0,
    message:
      issues.length === 0
        ? `${completedRows} spreadsheet row${completedRows === 1 ? " was" : "s were"} imported successfully.`
        : `${completedRows} of ${parsedRows.length} rows were imported. Review the rows listed below before trying again.`,
    created,
    reused,
    skippedPayments,
    issues,
  };
}
