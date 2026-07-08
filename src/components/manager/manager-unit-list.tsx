import Link from "next/link";
import type {
  ManagerPropertyRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";
import type { ManagerTenantOnboardingRequestRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type ManagerUnitListProps = {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants?: ManagerTenantRow[];
  onboardingRequests?: ManagerTenantOnboardingRequestRow[];
  showTenantActions?: boolean;
};

type UnitStatus = "vacant" | "reserved" | "occupied" | "inactive";

const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  vacant: "Vacant",
  reserved: "Reserved",
  occupied: "Occupied",
  inactive: "Inactive",
};

const OPEN_REQUEST_STATUSES = new Set<
  ManagerTenantOnboardingRequestRow["status"]
>([
  "pending",
  "submitted",
  "agreement_sent",
  "agreement_accepted",
  "payment_initialized",
]);

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

function getUnitStatusLabel(status: string) {
  return UNIT_STATUS_LABELS[status as UnitStatus] ?? "Unit";
}

function getStatusClassName(status: string) {
  if (status === "occupied") {
    return "bg-success-soft text-success";
  }

  if (status === "vacant") {
    return "bg-warning-soft text-warning";
  }

  if (status === "reserved") {
    return "bg-primary-soft text-primary";
  }

  return "bg-surface text-text-muted";
}

function getTenantPriority(status: ManagerTenantRow["status"]) {
  if (status === "active") {
    return 1;
  }

  if (status === "eviction_notice") {
    return 2;
  }

  if (status === "inactive") {
    return 3;
  }

  return 4;
}

function getRequestPriority(
  status: ManagerTenantOnboardingRequestRow["status"],
) {
  if (status === "submitted") {
    return 1;
  }

  if (status === "agreement_accepted") {
    return 2;
  }

  if (status === "payment_initialized") {
    return 3;
  }

  if (status === "agreement_sent") {
    return 4;
  }

  return 5;
}

function buildTenantByUnitId(tenants: ManagerTenantRow[]) {
  const sortedTenants = [...tenants].sort(
    (first, second) =>
      getTenantPriority(first.status) - getTenantPriority(second.status),
  );

  return new Map(sortedTenants.map((tenant) => [tenant.unit_id, tenant]));
}

function buildOpenRequestByUnitId(
  requests: ManagerTenantOnboardingRequestRow[],
) {
  const sortedRequests = requests
    .filter((request) => OPEN_REQUEST_STATUSES.has(request.status))
    .sort(
      (first, second) =>
        getRequestPriority(first.status) - getRequestPriority(second.status),
    );

  return new Map(sortedRequests.map((request) => [request.unit_id, request]));
}

function getRequestLabel(request: ManagerTenantOnboardingRequestRow) {
  if (request.status === "pending") {
    return "Waiting for tenant details";
  }

  if (request.status === "submitted") {
    return "Submitted for review";
  }

  if (request.status === "agreement_sent") {
    return "Agreement sent";
  }

  if (request.status === "agreement_accepted") {
    return "Agreement accepted";
  }

  if (request.status === "payment_initialized") {
    return "Awaiting payment";
  }

  return "In progress";
}

function getRequestActionLabel(request: ManagerTenantOnboardingRequestRow) {
  if (request.status === "submitted") {
    return "Review";
  }

  if (
    request.status === "agreement_accepted" ||
    request.status === "payment_initialized"
  ) {
    return "View payment";
  }

  return "View update";
}

function getReservedUnitMessage(tenant: ManagerTenantRow | undefined) {
  if (!tenant) {
    return "Awaiting first rent payment";
  }

  return `${tenant.full_name} · awaiting first rent payment`;
}

function getVisibleTenantForUnit(params: {
  unit: ManagerUnitRow;
  tenant: ManagerTenantRow | undefined;
}) {
  if (params.unit.status === "vacant") {
    return undefined;
  }

  return params.tenant;
}

export function ManagerUnitList({
  properties,
  units,
  tenants = [],
  onboardingRequests = [],
  showTenantActions = false,
}: ManagerUnitListProps) {
  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.property_name]),
  );

  const tenantByUnitId = buildTenantByUnitId(tenants);
  const openRequestByUnitId = buildOpenRequestByUnitId(onboardingRequests);

  return (
    <section
      id="units"
      className="rounded-card border border-border-soft bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-border-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Units
          </h2>
          <p className="text-sm font-semibold leading-6 text-text-muted">
            Add tenants from vacant units only.
          </p>
        </div>

        {showTenantActions ? (
          <Link
            href="#add-unit"
            prefetch={false}
            className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
          >
            Add unit
          </Link>
        ) : null}
      </div>

      {units.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-border-soft text-left">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Rent
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Tenant / request
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Status
                  </th>
                  {showTenantActions ? (
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-text-muted">
                      Action
                    </th>
                  ) : null}
                </tr>
              </thead>

              <tbody className="divide-y divide-border-soft bg-white">
                {units.map((unit) => {
                  const tenant = getVisibleTenantForUnit({
                    unit,
                    tenant: tenantByUnitId.get(unit.id),
                  });
                  const request = openRequestByUnitId.get(unit.id);
                  const tenantLabel =
                    unit.status === "reserved"
                      ? getReservedUnitMessage(tenant)
                      : tenant?.full_name;

                  return (
                    <tr key={unit.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="text-sm font-black text-text-strong">
                          {unit.unit_label}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-text-muted">
                          {propertyNameById.get(unit.property_id) ?? "Property"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {unit.unit_type ?? "Unit"}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {formatNaira(unit.rent_amount)}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {request ? (
                          <span className="text-primary">
                            {getRequestLabel(request)}
                          </span>
                        ) : tenant ? (
                          <Link
                            href={`/manager/tenants#tenant-${tenant.id}`}
                            prefetch={false}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {tenantLabel}
                          </Link>
                        ) : (
                          <span className="text-text-muted">
                            {unit.status === "reserved"
                              ? "Awaiting first rent payment"
                              : "None"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                            unit.status,
                          )}`}
                        >
                          {getUnitStatusLabel(unit.status)}
                        </span>
                      </td>

                      {showTenantActions ? (
                        <td className="px-4 py-4 text-right">
                          {request ? (
                            <Link
                              href="#tenant-review"
                              prefetch={false}
                              className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                            >
                              {getRequestActionLabel(request)}
                            </Link>
                          ) : unit.status === "vacant" ? (
                            <Link
                              href={`/manager/properties/${unit.property_id}?onboardUnit=${unit.id}#tenant-onboarding`}
                              prefetch={false}
                              className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                            >
                              Add tenant
                            </Link>
                          ) : unit.status === "reserved" ? (
                            <span className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary-soft px-4 text-sm font-extrabold text-primary">
                              Awaiting payment
                            </span>
                          ) : tenant ? (
                            <Link
                              href={`/manager/tenants#tenant-${tenant.id}`}
                              prefetch={false}
                              className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                            >
                              View tenant
                            </Link>
                          ) : (
                            <span className="text-sm font-bold text-text-muted">
                              No action
                            </span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border-soft md:hidden">
            {units.map((unit) => {
              const tenant = getVisibleTenantForUnit({
                unit,
                tenant: tenantByUnitId.get(unit.id),
              });
              const request = openRequestByUnitId.get(unit.id);
              const tenantLabel =
                unit.status === "reserved"
                  ? getReservedUnitMessage(tenant)
                  : (tenant?.full_name ?? "None");

              return (
                <article key={unit.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-text-strong">
                        {unit.unit_label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {unit.unit_type ?? "Unit"} ·{" "}
                        {formatNaira(unit.rent_amount)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        Tenant/request:{" "}
                        <span className="font-black text-text-strong">
                          {request ? getRequestLabel(request) : tenantLabel}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                        unit.status,
                      )}`}
                    >
                      {getUnitStatusLabel(unit.status)}
                    </span>
                  </div>

                  {showTenantActions ? (
                    <div className="mt-4">
                      {request ? (
                        <Link
                          href="#tenant-review"
                          prefetch={false}
                          className="inline-flex min-h-10 w-full items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                        >
                          {getRequestActionLabel(request)}
                        </Link>
                      ) : unit.status === "vacant" ? (
                        <Link
                          href={`/manager/properties/${unit.property_id}?onboardUnit=${unit.id}#tenant-onboarding`}
                          prefetch={false}
                          className="inline-flex min-h-10 w-full items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                        >
                          Add tenant
                        </Link>
                      ) : unit.status === "reserved" ? (
                        <span className="inline-flex min-h-10 w-full items-center justify-center rounded-button bg-primary-soft px-4 text-sm font-extrabold text-primary">
                          Awaiting first rent payment
                        </span>
                      ) : tenant ? (
                        <Link
                          href={`/manager/tenants#tenant-${tenant.id}`}
                          prefetch={false}
                          className="inline-flex min-h-10 w-full items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                        >
                          View tenant
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="p-4">
          <div className="rounded-card bg-surface p-4">
            <h3 className="font-black text-text-strong">No unit yet</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Add the first unit before adding tenants.
            </p>

            {showTenantActions ? (
              <Link
                href="#add-unit"
                prefetch={false}
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
              >
                Add unit
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
