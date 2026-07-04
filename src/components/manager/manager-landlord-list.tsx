import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerLandlordListProps = {
  landlordClients: ManagerLandlordClientRow[];
};

export function ManagerLandlordList({
  landlordClients,
}: ManagerLandlordListProps) {
  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Landlord clients
        </h2>
        <p className="text-sm font-semibold leading-6 text-text-muted">
          These are the landlords whose properties are managed by your company.
        </p>
      </div>

      {landlordClients.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft">
          {landlordClients.map((client) => (
            <article
              key={client.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-black text-text-strong">
                  {client.landlord_name}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {client.landlord_phone ?? "No phone number yet"}
                </p>
                {client.landlord_email ? (
                  <p className="mt-1 truncate text-sm font-semibold text-text-muted">
                    {client.landlord_email}
                  </p>
                ) : null}
              </div>

              <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                {client.status}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No landlord client has been added yet.
          </p>
        </div>
      )}
    </section>
  );
}
