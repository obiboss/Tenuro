import Link from "next/link";
import {
  MANAGER_MAINTENANCE_PRIORITY_LABELS,
  MANAGER_MAINTENANCE_STATUS_LABELS,
} from "@/constants/manager";
import type { ManagerMaintenanceRequestRow } from "@/server/repositories/manager-maintenance.repository";
import type {
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type Props = {
  propertyId: string;
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  maintenanceRequests: ManagerMaintenanceRequestRow[];
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${value}T00:00:00Z`));
}

function getPriorityClass(
  priority: ManagerMaintenanceRequestRow["priority"],
) {
  if (priority === "urgent") {
    return "bg-danger-soft text-danger";
  }

  if (priority === "high") {
    return "bg-warning-soft text-warning";
  }

  return "bg-primary-soft text-primary";
}

function getStatusClass(
  status: ManagerMaintenanceRequestRow["status"],
) {
  if (status === "resolved") {
    return "bg-success-soft text-success";
  }

  if (status === "cancelled") {
    return "bg-surface text-text-muted";
  }

  if (status === "in_progress") {
    return "bg-primary-soft text-primary";
  }

  return "bg-warning-soft text-warning";
}

function isOpenRequest(
  request: ManagerMaintenanceRequestRow,
) {
  return (
    request.status === "reported" ||
    request.status === "in_progress"
  );
}

export function ManagerPropertyMaintenanceActivity({
  propertyId,
  units,
  tenants,
  maintenanceRequests,
}: Props) {
  const unitLabelById = new Map(
    units.map((unit) => [unit.id, unit.unit_label]),
  );
  const tenantNameById = new Map(
    tenants.map((tenant) => [tenant.id, tenant.full_name]),
  );

  const openRequests = maintenanceRequests.filter(isOpenRequest);
  const urgentRequests = openRequests.filter(
    (request) =>
      request.priority === "urgent" ||
      request.priority === "high",
  );
  const expectedOpenCost = openRequests.reduce(
    (total, request) =>
      total + Number(request.estimated_cost || 0),
    0,
  );
  const recentRequests = maintenanceRequests.slice(0, 5);

  return (
    <section className="rounded-card border border-border-soft bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border-soft p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Maintenance activity
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Recent property issues and expected repair costs.
          </p>
        </div>

        <Link
          href={`/manager/maintenance?propertyId=${propertyId}`}
          prefetch={false}
          className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          Open maintenance
        </Link>
      </div>

      <div className="grid border-b border-border-soft sm:grid-cols-3 sm:divide-x sm:divide-border-soft">
        <div className="p-4">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Open issues
          </p>
          <p className="mt-1 text-xl font-black text-text-strong">
            {openRequests.length}
          </p>
        </div>

        <div className="border-t border-border-soft p-4 sm:border-t-0">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Urgent or high
          </p>
          <p
            className={`mt-1 text-xl font-black ${
              urgentRequests.length > 0
                ? "text-danger"
                : "text-text-strong"
            }`}
          >
            {urgentRequests.length}
          </p>
        </div>

        <div className="border-t border-border-soft p-4 sm:border-t-0">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Expected open cost
          </p>
          <p className="mt-1 text-xl font-black text-text-strong">
            {formatMoney(expectedOpenCost)}
          </p>
        </div>
      </div>

      {recentRequests.length > 0 ? (
        <div className="divide-y divide-border-soft">
          {recentRequests.map((request) => (
            <article
              key={request.id}
              className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-text-strong">
                    {request.issue_title}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getPriorityClass(
                      request.priority,
                    )}`}
                  >
                    {
                      MANAGER_MAINTENANCE_PRIORITY_LABELS[
                        request.priority
                      ]
                    }
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClass(
                      request.status,
                    )}`}
                  >
                    {
                      MANAGER_MAINTENANCE_STATUS_LABELS[
                        request.status
                      ]
                    }
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                  {request.unit_id
                    ? unitLabelById.get(request.unit_id) ?? "Unit"
                    : "Property-wide"}
                  {request.tenant_id
                    ? ` · ${
                        tenantNameById.get(request.tenant_id) ??
                        "Tenant"
                      }`
                    : ""}
                  {" · "}
                  Reported {formatDate(request.reported_date)}
                </p>
              </div>

              <div className="shrink-0 lg:text-right">
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Expected amount
                </p>
                <p className="mt-1 font-black text-text-strong">
                  {formatMoney(request.estimated_cost)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <p className="rounded-card bg-success-soft p-4 text-sm font-semibold leading-6 text-success">
            No maintenance issue has been recorded for this property.
          </p>
        </div>
      )}

      {maintenanceRequests.length > recentRequests.length ? (
        <div className="border-t border-border-soft p-4">
          <Link
            href={`/manager/maintenance?propertyId=${propertyId}`}
            prefetch={false}
            className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
          >
            View all {maintenanceRequests.length} maintenance records
          </Link>
        </div>
      ) : null}
    </section>
  );
}
