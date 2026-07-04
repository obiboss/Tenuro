import {
  MANAGER_MAINTENANCE_PRIORITY_LABELS,
  MANAGER_MAINTENANCE_STATUS_LABELS,
} from "@/constants/manager";
import type { ManagerMaintenanceRequestRow } from "@/server/repositories/manager-maintenance.repository";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerMaintenanceListProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  maintenanceRequests: ManagerMaintenanceRequestRow[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function getPriorityClass(priority: ManagerMaintenanceRequestRow["priority"]) {
  if (priority === "urgent") {
    return "bg-danger-soft text-danger";
  }

  if (priority === "high") {
    return "bg-warning-soft text-warning";
  }

  return "bg-primary-soft text-primary";
}

export function ManagerMaintenanceList({
  landlordClients,
  properties,
  units,
  tenants,
  maintenanceRequests,
}: ManagerMaintenanceListProps) {
  const landlordNameById = new Map(
    landlordClients.map((client) => [client.id, client.landlord_name]),
  );
  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.property_name]),
  );
  const unitLabelById = new Map(
    units.map((unit) => [unit.id, unit.unit_label]),
  );
  const tenantNameById = new Map(
    tenants.map((tenant) => [tenant.id, tenant.full_name]),
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Maintenance records
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Track reported repairs, status, vendor, and costs.
        </p>
      </div>

      {maintenanceRequests.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft">
          {maintenanceRequests.map((request) => (
            <article key={request.id} className="space-y-3 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-text-strong">
                    {request.issue_title}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {propertyNameById.get(request.property_id) ?? "Property"}
                    {request.unit_id
                      ? ` · ${unitLabelById.get(request.unit_id) ?? "Unit"}`
                      : " · Property-wide"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    Landlord Client:{" "}
                    {landlordNameById.get(request.landlord_client_id) ??
                      "Not available"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getPriorityClass(
                      request.priority,
                    )}`}
                  >
                    {MANAGER_MAINTENANCE_PRIORITY_LABELS[request.priority]}
                  </span>

                  <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                    {MANAGER_MAINTENANCE_STATUS_LABELS[request.status]}
                  </span>
                </div>
              </div>

              {request.issue_description ? (
                <p className="rounded-card bg-surface p-3 text-sm font-semibold leading-6 text-text-muted">
                  {request.issue_description}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Tenant
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {request.tenant_id
                      ? (tenantNameById.get(request.tenant_id) ?? "Tenant")
                      : "Not linked"}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Reported date
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatDate(request.reported_date)}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Resolved date
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatDate(request.resolved_date)}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Vendor
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {request.vendor_name ?? "Not assigned"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Estimated cost
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatNaira(request.estimated_cost)}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Actual cost
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatNaira(request.actual_cost)}
                  </p>
                </div>
              </div>

              {request.notes ? (
                <p className="rounded-card bg-primary-soft p-3 text-sm font-semibold leading-6 text-text-muted">
                  {request.notes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No maintenance issue has been recorded yet.
          </p>
        </div>
      )}
    </section>
  );
}
