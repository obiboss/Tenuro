import { MANAGER_PAYMENT_RECEIVER_LABELS } from "@/constants/manager";
import type {
  ManagerLandlordClientRow,
  ManagerLandlordPayoutProfileRow,
} from "@/server/repositories/manager.repository";

type ManagerPayoutProfileListProps = {
  landlordClients: ManagerLandlordClientRow[];
  payoutProfiles: ManagerLandlordPayoutProfileRow[];
};

export function ManagerPayoutProfileList({
  landlordClients,
  payoutProfiles,
}: ManagerPayoutProfileListProps) {
  const landlordNameById = new Map(
    landlordClients.map((client) => [client.id, client.landlord_name]),
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Payout profiles
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Saved landlord payout details for manual remittance tracking.
        </p>
      </div>

      {payoutProfiles.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft">
          {payoutProfiles.map((profile) => (
            <article key={profile.id} className="space-y-3 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-text-strong">
                    {profile.receiver_name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {landlordNameById.get(profile.landlord_client_id) ??
                      "Landlord client"}
                  </p>
                </div>

                {profile.is_default ? (
                  <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                    Default
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Receiver
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {MANAGER_PAYMENT_RECEIVER_LABELS[profile.payment_receiver]}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Bank
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {profile.bank_name ?? "Not set"}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Account number
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {profile.account_number ?? "Not set"}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Account name
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {profile.account_name ?? "Not set"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No payout profile has been saved yet.
          </p>
        </div>
      )}
    </section>
  );
}
