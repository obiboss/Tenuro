"use client";

import Link from "next/link";
import { ManagerTenantList } from "@/components/manager/manager-tenant-list";
import { useManagerOfflineData } from "@/components/manager/manager-offline-data-provider";
import { getManagerTenantRentStatus } from "@/lib/manager-rent-status";
import {
  applyOfflineTenantOccupancy,
  mergeManagerRows,
} from "@/lib/offline/manager-data";
import type {
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";
import type { ManagerTenantAgreementDocumentRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type ExistingTenantEvidence = Array<{
  tenantId: string;
  amount: number | null;
  paymentDate: string | null;
  receipt: {
    label: string;
    signedUrl: string | null;
  };
}>;

type ManagerTenantsOfflineViewProps = {
  initialProperties: ManagerPropertyRow[];
  initialUnits: ManagerUnitRow[];
  initialTenants: ManagerTenantRow[];
  initialPayments: ManagerRentPaymentRow[];
  agreementDocuments: ManagerTenantAgreementDocumentRow[];
  existingTenantEvidence: ExistingTenantEvidence;
  searchQuery: string;
  rentFilter: string;
};

function getTenantSummary(params: {
  tenants: ManagerTenantRow[];
  units: ManagerUnitRow[];
}) {
  const unitById = new Map(params.units.map((unit) => [unit.id, unit]));

  return params.tenants.reduce(
    (summary, tenant) => {
      if (
        tenant.move_out_date ||
        (tenant.status !== "active" && tenant.status !== "eviction_notice")
      ) {
        return summary;
      }

      const rentStatus = getManagerTenantRentStatus({
        tenant,
        unit: unitById.get(tenant.unit_id),
      });

      summary.current += 1;

      if (rentStatus.kind === "owing") {
        summary.owing += 1;
      }

      if (rentStatus.kind === "due_soon") {
        summary.dueSoon += 1;
      }

      if (tenant.status === "eviction_notice") {
        summary.noticeServed += 1;
      }

      return summary;
    },
    { current: 0, owing: 0, dueSoon: 0, noticeServed: 0 },
  );
}

export function ManagerTenantsOfflineView({
  initialProperties,
  initialUnits,
  initialTenants,
  initialPayments,
  agreementDocuments,
  existingTenantEvidence,
  searchQuery,
  rentFilter,
}: ManagerTenantsOfflineViewProps) {
  const offline = useManagerOfflineData();
  const properties = mergeManagerRows(initialProperties, offline.properties);
  const tenants = mergeManagerRows(initialTenants, offline.tenants);
  const units = applyOfflineTenantOccupancy(
    mergeManagerRows(initialUnits, offline.units),
    tenants,
  );
  const payments = mergeManagerRows(initialPayments, offline.payments);
  const tenantSummary = getTenantSummary({ tenants, units });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-strong">
            Tenants
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Monitor rent positions, balances, due dates, and occupied units.
          </p>
        </div>

        <Link
          href="/manager/properties"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          Add tenant from property
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Current tenants", tenantSummary.current],
          ["Owing", tenantSummary.owing],
          ["Due soon", tenantSummary.dueSoon],
          ["Notice served", tenantSummary.noticeServed],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-card border border-border-soft bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {Number(value).toLocaleString("en-NG")}
            </p>
          </div>
        ))}
      </section>

      <ManagerTenantList
        properties={properties}
        units={units}
        tenants={tenants}
        payments={payments}
        agreementDocuments={agreementDocuments}
        existingTenantEvidence={existingTenantEvidence}
        searchQuery={searchQuery}
        rentFilter={rentFilter}
      />
    </div>
  );
}
