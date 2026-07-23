import "server-only";

import type {
  ManagerUnifiedReportData,
} from "@/lib/manager-unified-report";

import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import {
  listAllManagerLandlordRemittances,
  listAllManagerMaintenanceRequests,
  listAllManagerRentPayments,
} from "@/server/services/manager-operational-data.service";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";


type ManagerUnifiedReportInput = {
  landlordClientId?: string | null;
  propertyId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

function lagosDateOnly() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function defaultDateFrom(dateTo: string) {
  const date = new Date(`${dateTo}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

function normaliseDate(value: string | null | undefined, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? String(value) : fallback;
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function withinPeriod(value: string, dateFrom: string, dateTo: string) {
  const date = dateOnly(value);
  return date >= dateFrom && date <= dateTo;
}

function isReliablePayment(status: string) {
  return status === "recorded" || status === "verified";
}

function isReliableRemittance(status: string) {
  return status === "recorded" || status === "confirmed";
}

function remittancePropertyId(metadata: Record<string, unknown>) {
  const value = metadata.property_id;
  return typeof value === "string" ? value : null;
}

function paymentSource(metadata: Record<string, unknown>, status: string) {
  const source = typeof metadata.source === "string" ? metadata.source.toLowerCase() : "";

  return status === "verified" || source.includes("paystack") || source.includes("checkout")
    ? ("Via app" as const)
    : ("Manual" as const);
}

function rentPosition(params: {
  currentBalance: number;
  nextDueDate: string | null;
  today: string;
}) {
  const balance = Math.max(0, Number(params.currentBalance));

  if (balance > 0) {
    return {
      status: "owing" as const,
      statusLabel: "Owing",
      balance,
    };
  }

  if (params.nextDueDate) {
    const target = new Date(`${params.nextDueDate}T00:00:00Z`);
    const current = new Date(`${params.today}T00:00:00Z`);
    const days = Math.round((target.getTime() - current.getTime()) / 86_400_000);

    if (days < 0) {
      return {
        status: "owing" as const,
        statusLabel: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
        balance: 0,
      };
    }

    if (days <= 30) {
      return {
        status: "due_soon" as const,
        statusLabel: days === 0 ? "Due today" : `Due in ${days} days`,
        balance: 0,
      };
    }
  }

  return {
    status: "paid_up" as const,
    statusLabel: "Paid up",
    balance: 0,
  };
}

export async function getManagerUnifiedReportData(
  input: ManagerUnifiedReportInput = {},
): Promise<ManagerUnifiedReportData> {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    return {
      landlordOptions: [],
      propertyOptions: [],
      snapshot: null,
    };
  }

  const [landlords, properties, units, tenants, payments, remittances, maintenance] =
    await Promise.all([
      listManagerLandlordClients(supabase, organization.id),
      listManagerProperties(supabase, organization.id),
      listManagerUnits(supabase, { organizationId: organization.id }),
      listManagerTenants(supabase, { organizationId: organization.id }),
      listAllManagerRentPayments(supabase, organization.id),
      listAllManagerLandlordRemittances(supabase, organization.id),
      listAllManagerMaintenanceRequests(supabase, organization.id),
    ]);

  const activeLandlords = landlords.filter((landlord) => landlord.status !== "archived");
  const activeProperties = properties.filter((property) => property.status !== "archived");
  const selectedLandlord = input.landlordClientId
    ? activeLandlords.find(
        (landlord) => landlord.id === input.landlordClientId,
      ) ?? null
    : activeLandlords[0] ?? null;
  const landlordProperties = selectedLandlord
    ? activeProperties.filter(
        (property) => property.landlord_client_id === selectedLandlord.id,
      )
    : [];
  const selectedProperty = input.propertyId
    ? landlordProperties.find(
        (property) => property.id === input.propertyId,
      ) ?? null
    : landlordProperties[0] ?? null;

  if (!selectedLandlord || !selectedProperty) {
    return {
      landlordOptions: activeLandlords,
      propertyOptions: activeProperties,
      snapshot: null,
    };
  }

  const today = lagosDateOnly();
  const dateTo = normaliseDate(input.dateTo, today);
  const dateFrom = normaliseDate(input.dateFrom, defaultDateFrom(dateTo));
  const safeDateFrom = dateFrom <= dateTo ? dateFrom : dateTo;
  const safeDateTo = dateFrom <= dateTo ? dateTo : dateFrom;
  const propertyUnits = units.filter((unit) => unit.property_id === selectedProperty.id);
  const unitById = new Map(propertyUnits.map((unit) => [unit.id, unit]));
  const propertyTenants = tenants.filter(
    (tenant) =>
      tenant.property_id === selectedProperty.id &&
      (tenant.status === "active" || tenant.status === "eviction_notice"),
  );
  const tenantById = new Map(propertyTenants.map((tenant) => [tenant.id, tenant]));

  const reliablePayments = payments.filter(
    (payment) =>
      payment.property_id === selectedProperty.id &&
      isReliablePayment(payment.status) &&
      withinPeriod(payment.payment_date, safeDateFrom, safeDateTo),
  );
  const reportExpenses = maintenance.filter(
    (request) =>
      request.property_id === selectedProperty.id &&
      withinPeriod(request.reported_date, safeDateFrom, safeDateTo),
  );
  const propertyRemittances = remittances.filter(
    (remittance) =>
      remittance.landlord_client_id === selectedLandlord.id &&
      remittancePropertyId(remittance.metadata) === selectedProperty.id &&
      isReliableRemittance(remittance.status) &&
      withinPeriod(remittance.remittance_date, safeDateFrom, safeDateTo),
  );
  const unallocatedLandlordRemittances = remittances
    .filter(
      (remittance) =>
        remittance.landlord_client_id === selectedLandlord.id &&
        !remittancePropertyId(remittance.metadata) &&
        isReliableRemittance(remittance.status) &&
        withinPeriod(remittance.remittance_date, safeDateFrom, safeDateTo),
    )
    .reduce((total, remittance) => total + Number(remittance.amount_remitted), 0);

  const rentCollected = reliablePayments.reduce(
    (total, payment) => total + Number(payment.amount_paid),
    0,
  );
  const managerCommission = reliablePayments.reduce(
    (total, payment) => total + Number(payment.management_fee_amount),
    0,
  );
  const grossLandlordShare = reliablePayments.reduce(
    (total, payment) => total + Number(payment.landlord_net_amount),
    0,
  );
  const maintenanceAndExpenses = reportExpenses.reduce(
    (total, request) =>
      total +
      Math.max(
        0,
        Number(request.actual_cost) || Number(request.estimated_cost) || 0,
      ),
    0,
  );
  const amountDueToLandlord = Math.max(
    0,
    grossLandlordShare - maintenanceAndExpenses,
  );
  const amountRemitted = propertyRemittances.reduce(
    (total, remittance) => total + Number(remittance.amount_remitted),
    0,
  );

  const rentPositions = propertyTenants.map((tenant) => {
    const position = rentPosition({
      currentBalance: Number(tenant.current_balance),
      nextDueDate: tenant.next_rent_due_date,
      today,
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.full_name,
      unitLabel: unitById.get(tenant.unit_id)?.unit_label ?? "Unit",
      rentAmount: Number(tenant.rent_amount),
      status: position.status,
      statusLabel: position.statusLabel,
      nextDueDate: tenant.next_rent_due_date,
      balance: position.balance,
    };
  });

  const occupiedUnitIds = new Set(propertyTenants.map((tenant) => tenant.unit_id));
  const occupiedUnits = propertyUnits.filter((unit) => occupiedUnitIds.has(unit.id)).length;
  const totalUnits = propertyUnits.length;

  return {
    landlordOptions: activeLandlords,
    propertyOptions: activeProperties,
    snapshot: {
      organization: {
        name: organization.organization_name,
        phone: organization.organization_phone,
        email: organization.organization_email,
      },
      landlord: selectedLandlord,
      property: selectedProperty,
      period: {
        dateFrom: safeDateFrom,
        dateTo: safeDateTo,
      },
      totals: {
        rentCollected,
        managerCommission,
        maintenanceAndExpenses,
        grossLandlordShare,
        amountDueToLandlord,
        amountRemitted,
        pendingLandlordBalance: Math.max(0, amountDueToLandlord - amountRemitted),
        unallocatedLandlordRemittances,
      },
      occupancy: {
        totalUnits,
        occupiedUnits,
        vacantUnits: Math.max(0, totalUnits - occupiedUnits),
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
        tenantsOwing: rentPositions.filter((position) => position.status === "owing").length,
        tenantsDueSoon: rentPositions.filter((position) => position.status === "due_soon").length,
      },
      rentPositions,
      expenses: reportExpenses.map((request) => ({
        id: request.id,
        title: request.issue_title,
        date: request.reported_date,
        amount: Math.max(
          0,
          Number(request.actual_cost) || Number(request.estimated_cost) || 0,
        ),
        status: request.status,
        vendorName: request.vendor_name,
      })),
      payments: reliablePayments.map((payment) => ({
        id: payment.id,
        tenantName: tenantById.get(payment.tenant_id)?.full_name ?? "Tenant",
        unitLabel: unitById.get(payment.unit_id)?.unit_label ?? "Unit",
        paymentDate: payment.payment_date,
        amountPaid: Number(payment.amount_paid),
        managerCommission: Number(payment.management_fee_amount),
        landlordNetAmount: Number(payment.landlord_net_amount),
        paymentMethod: payment.payment_method,
        source: paymentSource(payment.metadata, payment.status),
      })),
      remittances: propertyRemittances.map((remittance) => ({
        id: remittance.id,
        remittanceDate: remittance.remittance_date,
        amountRemitted: Number(remittance.amount_remitted),
        paymentMethod: remittance.payment_method,
        paymentReference: remittance.payment_reference,
      })),
    },
  };
}
