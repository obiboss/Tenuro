import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
} from "@/server/repositories/manager.repository";

type Props = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  selectedPropertyId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

function buildQuery(params: {
  propertyId: string;
  dateFrom: string | null;
  dateTo: string | null;
}) {
  return new URLSearchParams({
    propertyId: params.propertyId,
    dateFrom: params.dateFrom ?? "",
    dateTo: params.dateTo ?? "",
  }).toString();
}

export function ManagerPropertyReportActions({
  landlordClients,
  properties,
  selectedPropertyId,
  dateFrom,
  dateTo,
}: Props) {
  const activeProperties = properties.filter(
    (property) => property.status === "active",
  );
  const landlordNameById = new Map(
    landlordClients.map((landlord) => [
      landlord.id,
      landlord.landlord_name,
    ]),
  );

  const query = selectedPropertyId
    ? buildQuery({
        propertyId: selectedPropertyId,
        dateFrom,
        dateTo,
      })
    : "";

  return (
    <section className="rounded-card border border-border-soft bg-white shadow-sm">
      <div className="border-b border-border-soft p-4">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Property report
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Create a professional report covering rent, occupancy, tenant
          position, and maintenance activity.
        </p>
      </div>

      <form
        method="get"
        className="grid gap-4 p-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]"
      >
        <input
          type="hidden"
          name="landlordClientId"
          value=""
        />

        <div className="space-y-2">
          <label
            htmlFor="property-report-property"
            className="text-sm font-bold text-text-strong"
          >
            Property
          </label>

          <select
            id="property-report-property"
            name="propertyId"
            defaultValue={selectedPropertyId ?? ""}
            disabled={activeProperties.length === 0}
            required
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeProperties.length > 0 ? (
              activeProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_name} —{" "}
                  {landlordNameById.get(
                    property.landlord_client_id,
                  ) ?? "Landlord"}
                </option>
              ))
            ) : (
              <option value="">No active property</option>
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="property-report-date-from"
            className="text-sm font-bold text-text-strong"
          >
            From
          </label>

          <input
            id="property-report-date-from"
            name="propertyDateFrom"
            type="date"
            defaultValue={dateFrom ?? ""}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="property-report-date-to"
            className="text-sm font-bold text-text-strong"
          >
            To
          </label>

          <input
            id="property-report-date-to"
            name="propertyDateTo"
            type="date"
            defaultValue={dateTo ?? ""}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={activeProperties.length === 0}
            className="min-h-12 w-full rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prepare
          </button>
        </div>
      </form>

      {selectedPropertyId ? (
        <div className="grid gap-3 border-t border-border-soft p-4 sm:grid-cols-2">
          <a
            href={`/manager/reports/property-report/download?${query}`}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
          >
            Download property report
          </a>

          <a
            href={`/manager/reports/property-report/share?${query}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            Send to landlord
          </a>
        </div>
      ) : null}

      <div className="border-t border-border-soft p-4">
        <p className="rounded-card bg-warning-soft p-4 text-sm font-semibold leading-6 text-text-muted">
          Landlord remittances are not assigned to individual properties in
          the current records. They remain in the landlord statement so this
          report does not make an inaccurate allocation.
        </p>
      </div>
    </section>
  );
}
