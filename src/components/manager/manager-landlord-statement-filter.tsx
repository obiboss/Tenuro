import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerLandlordStatementFilterProps = {
  landlordClients: ManagerLandlordClientRow[];
  selectedLandlordClientId: string | null;
};

export function ManagerLandlordStatementFilter({
  landlordClients,
  selectedLandlordClientId,
}: ManagerLandlordStatementFilterProps) {
  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <form method="get" className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <label
            htmlFor="manager-statement-landlord"
            className="text-sm font-bold text-text-strong"
          >
            Landlord Client
          </label>
          <select
            id="manager-statement-landlord"
            name="landlordClientId"
            defaultValue={selectedLandlordClientId ?? ""}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            disabled={landlordClients.length === 0}
          >
            {landlordClients.length > 0 ? (
              landlordClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.landlord_name}
                </option>
              ))
            ) : (
              <option value="">No landlord client yet</option>
            )}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={landlordClients.length === 0}
            className="min-h-12 w-full rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            View Statement
          </button>
        </div>
      </form>
    </section>
  );
}
