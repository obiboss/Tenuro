import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type Props = {
  landlordClients: ManagerLandlordClientRow[];
  selectedLandlordClientId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  propertyId: string | null;
  propertyDateFrom: string | null;
  propertyDateTo: string | null;
};

function buildQuery(params: {
  landlordClientId: string;
  dateFrom: string | null;
  dateTo: string | null;
}) {
  return new URLSearchParams({
    landlordClientId: params.landlordClientId,
    dateFrom: params.dateFrom ?? "",
    dateTo: params.dateTo ?? "",
  }).toString();
}

export function ManagerStatementDocumentActions({
  landlordClients,
  selectedLandlordClientId,
  dateFrom,
  dateTo,
  propertyId,
  propertyDateFrom,
  propertyDateTo,
}: Props) {
  const activeLandlords = landlordClients.filter(
    (client) => client.status === "active",
  );

  const query = selectedLandlordClientId
    ? buildQuery({
        landlordClientId: selectedLandlordClientId,
        dateFrom,
        dateTo,
      })
    : "";

  return (
    <section className="rounded-card border border-border-soft bg-white shadow-sm">
      <div className="border-b border-border-soft p-4">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Landlord statement
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Review rent received, fees, landlord share, remittances, and the
          remaining landlord balance.
        </p>
      </div>

      <form
        className="grid gap-4 p-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]"
        method="get"
      >
        {propertyId ? (
          <input
            type="hidden"
            name="propertyId"
            value={propertyId}
          />
        ) : null}
        {propertyDateFrom ? (
          <input
            type="hidden"
            name="propertyDateFrom"
            value={propertyDateFrom}
          />
        ) : null}
        {propertyDateTo ? (
          <input
            type="hidden"
            name="propertyDateTo"
            value={propertyDateTo}
          />
        ) : null}

        <div className="space-y-2">
          <label
            htmlFor="manager-statement-landlord"
            className="text-sm font-bold text-text-strong"
          >
            Landlord
          </label>

          <select
            id="manager-statement-landlord"
            name="landlordClientId"
            defaultValue={selectedLandlordClientId ?? ""}
            disabled={activeLandlords.length === 0}
            required
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeLandlords.length > 0 ? (
              activeLandlords.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.landlord_name}
                </option>
              ))
            ) : (
              <option value="">No active landlord</option>
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="manager-statement-date-from"
            className="text-sm font-bold text-text-strong"
          >
            From
          </label>

          <input
            id="manager-statement-date-from"
            name="dateFrom"
            type="date"
            defaultValue={dateFrom ?? ""}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="manager-statement-date-to"
            className="text-sm font-bold text-text-strong"
          >
            To
          </label>

          <input
            id="manager-statement-date-to"
            name="dateTo"
            type="date"
            defaultValue={dateTo ?? ""}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={activeLandlords.length === 0}
            className="min-h-12 w-full rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            View
          </button>
        </div>
      </form>

      {selectedLandlordClientId ? (
        <div className="grid gap-3 border-t border-border-soft p-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href={`/manager/reports/landlord-statement/download?${query}`}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
          >
            Download statement
          </a>

          <a
            href={`/manager/reports/landlord-statement/share?${query}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            Send statement
          </a>

          <a
            href={`/manager/remittances/summary/download?${query}`}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
          >
            Download remittance
          </a>

          <a
            href={`/manager/remittances/summary/share?${query}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            Send remittance
          </a>
        </div>
      ) : null}
    </section>
  );
}
