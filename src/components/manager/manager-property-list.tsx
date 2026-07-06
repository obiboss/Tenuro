import Link from "next/link";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerPropertyListProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  searchQuery: string;
  statusFilter: string;
  collectionFilter: string;
};

type PropertyUnitSummary = {
  total: number;
  occupied: number;
  vacant: number;
};

const collectionFilterOptions = [
  {
    value: "all",
    label: "All collection methods",
  },
  {
    value: "manager_collects",
    label: "Manager collects",
  },
  {
    value: "landlord_direct",
    label: "Landlord direct",
  },
  {
    value: "automatic_split",
    label: "BOPA split",
  },
] as const;

const statusFilterOptions = [
  {
    value: "all",
    label: "All statuses",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
] as const;

function formatFee(property: ManagerPropertyRow) {
  const feeValue = Number(property.management_fee_value);

  if (!Number.isFinite(feeValue) || feeValue <= 0) {
    return "No fee";
  }

  if (property.management_fee_type === "percentage") {
    return `${feeValue.toLocaleString("en-NG")}%`;
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(feeValue);
}

function getCollectionSummary(property: ManagerPropertyRow) {
  if (property.collection_mode === "manager_collects") {
    return "Manager collects";
  }

  if (property.collection_mode === "landlord_direct") {
    return "Landlord direct";
  }

  return "BOPA split";
}

function getStatusClassName(status: string) {
  if (status === "active") {
    return "bg-success-soft text-success";
  }

  return "bg-surface text-text-muted";
}

function buildUnitSummaryByPropertyId(units: ManagerUnitRow[]) {
  return units.reduce((summary, unit) => {
    const existing = summary.get(unit.property_id) ?? {
      total: 0,
      occupied: 0,
      vacant: 0,
    };

    existing.total += 1;

    if (unit.status === "occupied") {
      existing.occupied += 1;
    }

    if (unit.status === "vacant") {
      existing.vacant += 1;
    }

    summary.set(unit.property_id, existing);

    return summary;
  }, new Map<string, PropertyUnitSummary>());
}

function normaliseFilter(value: string, allowedValues: readonly string[]) {
  return allowedValues.includes(value) ? value : "all";
}

export function ManagerPropertyList({
  landlordClients,
  properties,
  units,
  searchQuery,
  statusFilter,
  collectionFilter,
}: ManagerPropertyListProps) {
  const safeSearchQuery = searchQuery.trim();
  const safeStatusFilter = normaliseFilter(
    statusFilter,
    statusFilterOptions.map((option) => option.value),
  );
  const safeCollectionFilter = normaliseFilter(
    collectionFilter,
    collectionFilterOptions.map((option) => option.value),
  );

  const landlordNameById = new Map(
    landlordClients.map((client) => [client.id, client.landlord_name]),
  );

  const unitSummaryByPropertyId = buildUnitSummaryByPropertyId(units);
  const lowerSearchQuery = safeSearchQuery.toLowerCase();

  const filteredProperties = properties
    .filter((property) => {
      if (safeStatusFilter !== "all" && property.status !== safeStatusFilter) {
        return false;
      }

      if (
        safeCollectionFilter !== "all" &&
        property.collection_mode !== safeCollectionFilter
      ) {
        return false;
      }

      if (!lowerSearchQuery) {
        return true;
      }

      const landlordName =
        landlordNameById.get(property.landlord_client_id) ?? "";

      return [
        property.property_name,
        property.property_address,
        property.city,
        property.state,
        property.lga,
        landlordName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(lowerSearchQuery);
    })
    .sort((first, second) =>
      first.property_name.localeCompare(second.property_name),
    );

  if (properties.length === 0) {
    return (
      <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          No property yet
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Add your first property, then add units and tenants.
        </p>

        <Link
          href="/manager/properties/new"
          prefetch={false}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          Add property
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-border-soft bg-white shadow-sm">
      <div className="border-b border-border-soft p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Property list
          </h2>
          <p className="text-sm font-semibold leading-6 text-text-muted">
            Search and open any managed property.
          </p>
        </div>

        <form
          action="/manager/properties"
          className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]"
        >
          <input
            type="search"
            name="q"
            defaultValue={safeSearchQuery}
            placeholder="Search property, landlord, or address"
            className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
          />

          <select
            name="status"
            defaultValue={safeStatusFilter}
            className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="collection"
            defaultValue={safeCollectionFilter}
            className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
          >
            {collectionFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="min-h-11 rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            Search
          </button>
        </form>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="p-5">
          <div className="rounded-card bg-surface p-4">
            <h3 className="font-black text-text-strong">No match found</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Try another property name, landlord, address, or filter.
            </p>

            <Link
              href="/manager/properties"
              prefetch={false}
              className="mt-3 inline-flex text-sm font-black text-primary"
            >
              Clear filters
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-border-soft text-left">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Property
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Landlord
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Units
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Occupied
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Vacant
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Collection
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Fee
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-text-muted">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-soft bg-white">
                {filteredProperties.map((property) => {
                  const unitSummary = unitSummaryByPropertyId.get(
                    property.id,
                  ) ?? {
                    total: 0,
                    occupied: 0,
                    vacant: 0,
                  };

                  return (
                    <tr key={property.id} className="align-top">
                      <td className="max-w-80 px-4 py-4">
                        <p className="truncate text-sm font-black text-text-strong">
                          {property.property_name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-text-muted">
                          {property.property_address}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {landlordNameById.get(property.landlord_client_id) ??
                          "Landlord"}
                      </td>

                      <td className="px-4 py-4 text-sm font-black text-text-strong">
                        {unitSummary.total.toLocaleString("en-NG")}
                      </td>

                      <td className="px-4 py-4 text-sm font-black text-text-strong">
                        {unitSummary.occupied.toLocaleString("en-NG")}
                      </td>

                      <td className="px-4 py-4 text-sm font-black text-text-strong">
                        {unitSummary.vacant.toLocaleString("en-NG")}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {getCollectionSummary(property)}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {formatFee(property)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                            property.status,
                          )}`}
                        >
                          {property.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/manager/properties/${property.id}`}
                          prefetch={false}
                          className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border-soft md:hidden">
            {filteredProperties.map((property) => {
              const unitSummary = unitSummaryByPropertyId.get(property.id) ?? {
                total: 0,
                occupied: 0,
                vacant: 0,
              };

              return (
                <article key={property.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-text-strong">
                        {property.property_name}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                        {landlordNameById.get(property.landlord_client_id) ??
                          "Landlord"}{" "}
                        · {unitSummary.total.toLocaleString("en-NG")} units ·{" "}
                        {unitSummary.vacant.toLocaleString("en-NG")} vacant
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-text-muted">
                        {property.property_address}
                      </p>
                      <p className="mt-1 text-sm font-bold text-text-strong">
                        {getCollectionSummary(property)} · {formatFee(property)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                        property.status,
                      )}`}
                    >
                      {property.status}
                    </span>
                  </div>

                  <Link
                    href={`/manager/properties/${property.id}`}
                    prefetch={false}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                  >
                    Open
                  </Link>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
