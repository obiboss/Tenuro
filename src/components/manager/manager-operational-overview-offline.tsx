"use client";

import { ManagerOperationalOverview } from "@/components/manager/manager-operational-overview";
import { useManagerOfflineData } from "@/components/manager/manager-offline-data-provider";
import { getManagerTenantRentStatus } from "@/lib/manager-rent-status";
import {
  applyOfflineTenantOccupancy,
  isManagerUnsyncedRow,
  mergeManagerRows,
  type ManagerOfflinePropertyRow,
  type ManagerOfflineRentPaymentRow,
  type ManagerOfflineTenantRow,
  type ManagerOfflineUnitRow,
} from "@/lib/offline/manager-data";
import type {
  ManagerLandlordClientRow,
  ManagerOverview,
  ManagerOverviewAttentionItem,
  ManagerOverviewPropertySummary,
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerOperationalOverviewOfflineProps = {
  managerName: string;
  overview: ManagerOverview;
  initialLandlordClients: ManagerLandlordClientRow[];
  initialProperties: ManagerPropertyRow[];
  initialUnits: ManagerUnitRow[];
  initialTenants: ManagerTenantRow[];
  initialPayments: ManagerRentPaymentRow[];
};

function isCurrentTenant(tenant: ManagerTenantRow) {
  return (
    !tenant.move_out_date &&
    (tenant.status === "active" || tenant.status === "eviction_notice")
  );
}

function buildPropertySummaries(params: {
  properties: ManagerOfflinePropertyRow[];
  landlordClients: ManagerLandlordClientRow[];
  units: ManagerOfflineUnitRow[];
  tenants: ManagerOfflineTenantRow[];
  attentionItems: ManagerOverviewAttentionItem[];
}): ManagerOverviewPropertySummary[] {
  const landlordNameById = new Map(
    params.landlordClients.map((client) => [client.id, client.landlord_name]),
  );
  const currentTenantUnitIds = new Set(
    params.tenants.filter(isCurrentTenant).map((tenant) => tenant.unit_id),
  );

  return params.properties
    .filter((property) => property.status === "active")
    .map((property) => {
      const propertyUnits = params.units.filter(
        (unit) => unit.property_id === property.id,
      );
      let occupiedUnits = 0;
      let vacantUnits = 0;
      let unavailableUnits = 0;

      for (const unit of propertyUnits) {
        if (unit.status === "inactive" || unit.status === "reserved") {
          unavailableUnits += 1;
        } else if (
          currentTenantUnitIds.has(unit.id) ||
          unit.status === "occupied"
        ) {
          occupiedUnits += 1;
        } else {
          vacantUnits += 1;
        }
      }

      return {
        id: property.id,
        propertyName: property.property_name,
        landlordName:
          landlordNameById.get(property.landlord_client_id) ??
          property.offline_landlord_name ??
          "Landlord",
        totalUnits: propertyUnits.length,
        occupiedUnits,
        vacantUnits,
        unavailableUnits,
        needsAttentionCount: params.attentionItems.filter(
          (item) => item.propertyId === property.id,
        ).length,
        href: isManagerUnsyncedRow(property)
          ? `/manager/properties?pendingProperty=${encodeURIComponent(property.id)}`
          : `/manager/properties/${property.id}`,
      };
    })
    .sort((first, second) =>
      first.propertyName.localeCompare(second.propertyName),
    );
}

function buildLocalRecentActivity(params: {
  properties: ManagerOfflinePropertyRow[];
  units: ManagerOfflineUnitRow[];
  tenants: ManagerOfflineTenantRow[];
  payments: ManagerOfflineRentPaymentRow[];
}) {
  const propertyNameById = new Map(
    params.properties.map((property) => [property.id, property.property_name]),
  );
  const unitLabelById = new Map(
    params.units.map((unit) => [unit.id, unit.unit_label]),
  );

  return [
    ...params.properties
      .filter(isManagerUnsyncedRow)
      .map((property) => ({
        id: `offline-property-${property.id}`,
        description: `${property.property_name} was saved on this device`,
        date: property.created_at,
        href: isManagerUnsyncedRow(property)
          ? `/manager/properties?pendingProperty=${encodeURIComponent(property.id)}`
          : `/manager/properties/${property.id}`,
      })),
    ...params.units
      .filter(isManagerUnsyncedRow)
      .map((unit) => ({
        id: `offline-unit-${unit.id}`,
        description: `${unit.unit_label} was saved for ${
          propertyNameById.get(unit.property_id) ?? "a property"
        }`,
        date: unit.created_at,
        href: isManagerUnsyncedRow(
          params.properties.find((property) => property.id === unit.property_id),
        )
          ? `/manager/properties?pendingProperty=${encodeURIComponent(unit.property_id)}&tab=units`
          : `/manager/properties/${unit.property_id}?tab=units`,
      })),
    ...params.tenants
      .filter(isManagerUnsyncedRow)
      .map((tenant) => ({
        id: `offline-tenant-${tenant.id}`,
        description: `${tenant.full_name} was saved for ${
          unitLabelById.get(tenant.unit_id) ?? "a unit"
        }`,
        date: tenant.created_at,
        href: `/manager/tenants#tenant-${tenant.id}`,
      })),
    ...params.payments
      .filter(isManagerUnsyncedRow)
      .map((payment) => ({
        id: `offline-payment-${payment.id}`,
        description: `A rent payment was saved on this device`,
        date: payment.created_at,
        href: "/manager/payments",
      })),
  ]
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 6);
}

export function ManagerOperationalOverviewOffline({
  managerName,
  overview,
  initialLandlordClients,
  initialProperties,
  initialUnits,
  initialTenants,
  initialPayments,
}: ManagerOperationalOverviewOfflineProps) {
  const offline = useManagerOfflineData();
  const landlordClients = mergeManagerRows(
    initialLandlordClients,
    offline.landlordClients,
  );
  const properties = mergeManagerRows(initialProperties, offline.properties);
  const tenants = mergeManagerRows(initialTenants, offline.tenants);
  const units = applyOfflineTenantOccupancy(
    mergeManagerRows(initialUnits, offline.units),
    tenants,
  );
  const payments = mergeManagerRows(initialPayments, offline.payments);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const currentTenants = tenants.filter(isCurrentTenant);
  const currentTenantUnitIds = new Set(
    currentTenants.map((tenant) => tenant.unit_id),
  );

  const rentStatuses = currentTenants.map((tenant) =>
    getManagerTenantRentStatus({
      tenant,
      unit: unitById.get(tenant.unit_id),
    }),
  );

  const attentionItems = overview.attentionItems.filter((item) => {
    if (item.category !== "property_setup" || !item.propertyId) {
      return true;
    }

    const propertyUnits = units.filter(
      (unit) => unit.property_id === item.propertyId && unit.status !== "inactive",
    );

    return (
      propertyUnits.length === 0 ||
      propertyUnits.some((unit) => !currentTenantUnitIds.has(unit.id))
    );
  });

  const activeProperties = properties.filter(
    (property) => property.status === "active",
  );
  const occupiedUnitIds = new Set(
    units
      .filter(
        (unit) =>
          unit.status !== "inactive" &&
          (unit.status === "occupied" || currentTenantUnitIds.has(unit.id)),
      )
      .map((unit) => unit.id),
  );
  const vacantUnits = units.filter(
    (unit) =>
      unit.status === "vacant" && !occupiedUnitIds.has(unit.id),
  ).length;
  const countedPayments = payments.filter(
    (payment) => payment.status === "recorded" || payment.status === "verified",
  );

  const mergedOverview: ManagerOverview = {
    ...overview,
    totals: {
      ...overview.totals,
      landlordClients: landlordClients.filter(
        (client) => client.status === "active",
      ).length,
      totalProperties: properties.length,
      activeProperties: activeProperties.length,
      totalUnits: units.length,
      vacantUnits,
      occupiedUnits: occupiedUnitIds.size,
      totalTenants: currentTenants.length,
      activeTenants: currentTenants.filter((tenant) => tenant.status === "active")
        .length,
      totalRecordedPayments: countedPayments.length,
      totalVerifiedPayments: payments.filter(
        (payment) => payment.status === "verified",
      ).length,
      totalManagerCommission: countedPayments.reduce(
        (total, payment) => total + Number(payment.management_fee_amount || 0),
        0,
      ),
      totalLandlordShare: countedPayments.reduce(
        (total, payment) => total + Number(payment.landlord_net_amount || 0),
        0,
      ),
    },
    rentPosition: {
      totalTenants: currentTenants.length,
      owingTenants: rentStatuses.filter((status) => status.kind === "owing")
        .length,
      dueSoonTenants: rentStatuses.filter(
        (status) => status.kind === "due_soon",
      ).length,
      rentCollected: countedPayments.reduce(
        (total, payment) => total + Number(payment.amount_paid || 0),
        0,
      ),
      vacantUnits,
    },
    attentionItems,
    propertySummaries: buildPropertySummaries({
      properties,
      landlordClients,
      units,
      tenants,
      attentionItems,
    }),
    recentActivity: [
      ...buildLocalRecentActivity({ properties, units, tenants, payments }),
      ...overview.recentActivity,
    ]
      .filter(
        (activity, index, all) =>
          all.findIndex((candidate) => candidate.id === activity.id) === index,
      )
      .slice(0, 6),
  };

  return (
    <ManagerOperationalOverview
      managerName={managerName}
      overview={mergedOverview}
    />
  );
}
