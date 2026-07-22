"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ManagerTenantForm } from "@/components/manager/manager-tenant-form";
import { ManagerUnitForm } from "@/components/manager/manager-unit-form";
import { ManagerUnitList } from "@/components/manager/manager-unit-list";
import { useManagerOfflineData } from "@/components/manager/manager-offline-data-provider";
import {
  applyOfflineTenantOccupancy,
  getManagerOfflineStatusLabel,
  getManagerOfflineSyncStatus,
  isManagerUnsyncedRow,
} from "@/lib/offline/manager-data";

export function ManagerPendingPropertyDetail({
  propertyId,
}: {
  propertyId: string;
}) {
  const searchParams = useSearchParams();
  const offline = useManagerOfflineData();
  const property = offline.properties.find((item) => item.id === propertyId);

  if (!offline.ready) {
    return (
      <div className="mx-auto max-w-6xl rounded-card border border-border-soft bg-white p-5 shadow-sm">
        <p className="font-black text-text-strong">Opening saved property…</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="mx-auto max-w-6xl rounded-card border border-border-soft bg-white p-5 shadow-sm">
        <h1 className="text-xl font-black text-text-strong">
          Property is being refreshed
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          BOPA could not find a saved copy of this property on this device.
        </p>
        <Link
          href="/manager/properties"
          prefetch={false}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white"
        >
          Return to properties
        </Link>
      </div>
    );
  }

  const tenants = offline.tenants.filter(
    (tenant) => tenant.property_id === property.id,
  );
  const units = applyOfflineTenantOccupancy(
    offline.units.filter((unit) => unit.property_id === property.id),
    tenants,
  );
  const selectedUnitId = searchParams.get("onboardUnit");
  const selectedUnit = selectedUnitId
    ? units.find((unit) => unit.id === selectedUnitId)
    : null;
  const currentTenantUnitIds = new Set(
    tenants
      .filter(
        (tenant) =>
          !tenant.move_out_date &&
          (tenant.status === "active" || tenant.status === "eviction_notice"),
      )
      .map((tenant) => tenant.unit_id),
  );
  const occupiedCount = units.filter(
    (unit) =>
      unit.status !== "inactive" &&
      (unit.status === "occupied" || currentTenantUnitIds.has(unit.id)),
  ).length;
  const vacantCount = units.filter(
    (unit) => unit.status === "vacant" && !currentTenantUnitIds.has(unit.id),
  ).length;
  const showAddUnitForm = searchParams.get("addUnit") === "1";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/manager/properties"
          prefetch={false}
          className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
        >
          ← Properties
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-text-strong">
            {property.property_name}
          </h1>
          {isManagerUnsyncedRow(property) ? (
            <span
              className={
                getManagerOfflineSyncStatus(property) === "review"
                  ? "rounded-full bg-danger-soft px-3 py-1 text-xs font-black text-danger"
                  : "rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary"
              }
            >
              {getManagerOfflineStatusLabel(property)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          {property.property_address}
        </p>
        {property.offline_landlord_name ? (
          <p className="mt-1 text-sm font-semibold text-text-muted">
            Landlord: {property.offline_landlord_name}
          </p>
        ) : null}
      </div>

      <section className="grid grid-cols-3 gap-3">
        {[
          ["Units", units.length],
          ["Occupied", occupiedCount],
          ["Vacant", vacantCount],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-card border border-border-soft bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              {label}
            </p>
            <p className="mt-1 text-xl font-black text-text-strong">
              {Number(value).toLocaleString("en-NG")}
            </p>
          </div>
        ))}
      </section>

      <div className="rounded-card border border-primary/20 bg-primary-soft px-4 py-3 text-sm font-semibold leading-6 text-primary">
        Continue working normally. Records saved here appear immediately and sync automatically when BOPA can reach the server.
      </div>

      <ManagerUnitList
        properties={[property]}
        units={units}
        tenants={tenants}
        showTenantActions
        propertyDetailTab="units"
        addUnitHref={`/manager/properties?pendingProperty=${encodeURIComponent(property.id)}&tab=units&addUnit=1#add-unit`}
      />

      {selectedUnit && selectedUnit.status === "vacant" ? (
        <section
          id="tenant-onboarding"
          className="rounded-card border border-border-soft bg-white p-4 shadow-sm"
        >
          <div className="mb-4">
            <h2 className="text-lg font-black text-text-strong">
              Add current occupant
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              {selectedUnit.unit_label} · {property.property_name}
            </p>
          </div>
          <ManagerTenantForm
            properties={[property]}
            units={[selectedUnit]}
            lockedPropertyId={property.id}
            lockedUnitId={selectedUnit.id}
          />
        </section>
      ) : selectedUnitId ? (
        <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="font-black text-text-strong">Unit is no longer vacant</p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            The saved tenant is already shown against this unit.
          </p>
        </section>
      ) : null}

      {showAddUnitForm ? (
        <section id="add-unit">
          <ManagerUnitForm
            properties={[property]}
            lockedPropertyId={property.id}
          />
        </section>
      ) : null}
    </div>
  );
}
