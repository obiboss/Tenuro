"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ManagerPendingPropertyDetail } from "@/components/manager/manager-pending-property-detail";
import { ManagerPropertyList } from "@/components/manager/manager-property-list";
import { useManagerOfflineData } from "@/components/manager/manager-offline-data-provider";
import {
  applyOfflineTenantOccupancy,
  mergeManagerRows,
} from "@/lib/offline/manager-data";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerPropertiesOfflineViewProps = {
  initialLandlordClients: ManagerLandlordClientRow[];
  initialProperties: ManagerPropertyRow[];
  initialUnits: ManagerUnitRow[];
  initialTenants: ManagerTenantRow[];
  searchQuery: string;
  statusFilter: string;
  collectionFilter: string;
};

function getUnitSummary(params: {
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
}) {
  const currentTenantUnitIds = new Set(
    params.tenants
      .filter(
        (tenant) =>
          !tenant.move_out_date &&
          (tenant.status === "active" || tenant.status === "eviction_notice"),
      )
      .map((tenant) => tenant.unit_id),
  );

  return params.units.reduce(
    (summary, unit) => {
      summary.total += 1;

      if (unit.status === "inactive") {
        return summary;
      }

      if (currentTenantUnitIds.has(unit.id) || unit.status === "occupied") {
        summary.occupied += 1;
      } else if (unit.status === "vacant") {
        summary.vacant += 1;
      }

      return summary;
    },
    { total: 0, occupied: 0, vacant: 0 },
  );
}

export function ManagerPropertiesOfflineView({
  initialLandlordClients,
  initialProperties,
  initialUnits,
  initialTenants,
  searchQuery,
  statusFilter,
  collectionFilter,
}: ManagerPropertiesOfflineViewProps) {
  const offline = useManagerOfflineData();
  const searchParams = useSearchParams();
  const pendingPropertyId = searchParams.get("pendingProperty");

  if (pendingPropertyId) {
    return <ManagerPendingPropertyDetail propertyId={pendingPropertyId} />;
  }

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
  const unitSummary = getUnitSummary({ units, tenants });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-strong">
            Properties
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Manage all properties, units, and tenants.
          </p>
        </div>

        {properties.length > 0 ? (
          <Link
            href="/manager/properties/new"
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            Add property
          </Link>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Total properties
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {properties.length.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Total units
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.total.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Occupied units
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.occupied.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Vacant units
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.vacant.toLocaleString("en-NG")}
          </p>
        </div>
      </section>

      <ManagerPropertyList
        landlordClients={landlordClients}
        properties={properties}
        units={units}
        tenants={tenants}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        collectionFilter={collectionFilter}
      />
    </div>
  );
}
