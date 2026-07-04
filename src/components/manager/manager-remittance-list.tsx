import {
  MANAGER_REMITTANCE_PAYMENT_METHOD_LABELS,
  MANAGER_REMITTANCE_STATUS_LABELS,
} from "@/constants/manager";
import type {
  ManagerLandlordClientRow,
  ManagerLandlordPayoutProfileRow,
  ManagerLandlordRemittanceRow,
  ManagerLandlordRemittanceSummary,
} from "@/server/repositories/manager.repository";

type ManagerRemittanceListProps = {
  landlordClients: ManagerLandlordClientRow[];
  payoutProfiles: ManagerLandlordPayoutProfileRow[];
  remittances: ManagerLandlordRemittanceRow[];
  summaries: ManagerLandlordRemittanceSummary[];
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

export function ManagerRemittanceList({
  landlordClients,
  payoutProfiles,
  remittances,
  summaries,
}: ManagerRemittanceListProps) {
  const landlordNameById = new Map(
    landlordClients.map((client) => [client.id, client.landlord_name]),
  );
  const payoutProfileById = new Map(
    payoutProfiles.map((profile) => [profile.id, profile]),
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Remittance tracking
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Track what is due to landlords and what has been manually remitted.
        </p>
      </div>

      {summaries.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary) => (
            <div
              key={summary.landlordClientId}
              className="rounded-card bg-primary-soft p-4"
            >
              <p className="font-black text-text-strong">
                {summary.landlordName}
              </p>
              <div className="mt-3 space-y-2 text-sm font-semibold text-text-muted">
                <div className="flex items-center justify-between gap-4">
                  <span>Due</span>
                  <span className="font-black text-text-strong">
                    {formatNaira(summary.amountDueToLandlord)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Remitted</span>
                  <span className="font-black text-text-strong">
                    {formatNaira(summary.amountRemitted)}
                  </span>
                </div>
                <div className="border-t border-primary/20 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <span>Pending</span>
                    <span className="font-black text-text-strong">
                      {formatNaira(summary.pendingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {remittances.length > 0 ? (
        <div className="mt-6 divide-y divide-border-soft">
          {remittances.map((remittance) => {
            const payoutProfile = remittance.payout_profile_id
              ? payoutProfileById.get(remittance.payout_profile_id)
              : null;

            return (
              <article key={remittance.id} className="space-y-3 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-text-strong">
                      {landlordNameById.get(remittance.landlord_client_id) ??
                        "Landlord client"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {formatDate(remittance.remittance_date)}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                    {MANAGER_REMITTANCE_STATUS_LABELS[remittance.status]}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Amount remitted
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {formatNaira(remittance.amount_remitted)}
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Payment method
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {
                        MANAGER_REMITTANCE_PAYMENT_METHOD_LABELS[
                          remittance.payment_method
                        ]
                      }
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Receiver
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {payoutProfile?.receiver_name ?? "Not selected"}
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Proof
                    </p>
                    {remittance.proof_url ? (
                      <a
                        href={remittance.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-black text-primary underline-offset-4 hover:underline"
                      >
                        View proof
                      </a>
                    ) : (
                      <p className="mt-1 text-sm font-black text-text-strong">
                        Not added
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Period
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatDate(remittance.period_start)} —{" "}
                    {formatDate(remittance.period_end)}
                  </p>
                </div>

                {remittance.payment_reference ? (
                  <p className="rounded-card bg-primary-soft p-3 text-sm font-semibold leading-6 text-text-muted">
                    Reference:{" "}
                    <span className="font-black text-text-strong">
                      {remittance.payment_reference}
                    </span>
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No landlord remittance has been recorded yet.
          </p>
        </div>
      )}
    </section>
  );
}
