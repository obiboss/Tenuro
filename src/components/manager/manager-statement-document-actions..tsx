import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerStatementDocumentActionsProps = {
  landlordClients: ManagerLandlordClientRow[];
  selectedLandlordClientId: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export function ManagerStatementDocumentActions({
  landlordClients,
  selectedLandlordClientId,
  dateFrom,
  dateTo,
}: ManagerStatementDocumentActionsProps) {
  const activeLandlords = landlordClients.filter(
    (client) => client.status === "active",
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Download landlord documents
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Choose a landlord and date range. BOPA will create the documents from
          saved payment and remittance records.
        </p>
      </div>

      <form
        className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]"
        method="get"
      >
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
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            required
          >
            <option value="" disabled>
              Select landlord
            </option>
            {activeLandlords.map((client) => (
              <option key={client.id} value={client.id}>
                {client.landlord_name}
              </option>
            ))}
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
            className="min-h-12 w-full rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            View
          </button>
        </div>
      </form>

      {selectedLandlordClientId ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href={`/manager/reports/landlord-statement/download?landlordClientId=${encodeURIComponent(
              selectedLandlordClientId,
            )}&dateFrom=${encodeURIComponent(dateFrom ?? "")}&dateTo=${encodeURIComponent(
              dateTo ?? "",
            )}`}
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            Download Statement PDF
          </a>

          <a
            href={`/manager/remittances/summary/download?landlordClientId=${encodeURIComponent(
              selectedLandlordClientId,
            )}&dateFrom=${encodeURIComponent(dateFrom ?? "")}&dateTo=${encodeURIComponent(
              dateTo ?? "",
            )}`}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
          >
            Download Remittance Summary
          </a>
        </div>
      ) : null}
    </section>
  );
}
