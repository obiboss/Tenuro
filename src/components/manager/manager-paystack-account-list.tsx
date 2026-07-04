import type {
  ManagerLandlordPaystackAccountRow,
  ManagerPaystackAccountRow,
} from "@/server/repositories/manager-paystack-accounts.repository";
import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerPaystackAccountListProps = {
  landlordClients: ManagerLandlordClientRow[];
  managerAccounts: ManagerPaystackAccountRow[];
  landlordAccounts: ManagerLandlordPaystackAccountRow[];
};

function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length < 4) {
    return accountNumber;
  }

  return `******${accountNumber.slice(-4)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not confirmed";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ManagerPaystackAccountList({
  landlordClients,
  managerAccounts,
  landlordAccounts,
}: ManagerPaystackAccountListProps) {
  const landlordNameById = new Map(
    landlordClients.map((client) => [client.id, client.landlord_name]),
  );

  const activeManagerAccount =
    managerAccounts.find((account) => account.is_active) ?? null;

  const activeLandlordAccounts = landlordAccounts.filter(
    (account) => account.is_active,
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Saved payout accounts
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          BOPA uses active accounts when creating online rent payment links.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-card bg-surface p-4">
          <p className="text-sm font-black text-text-strong">Manager account</p>

          {activeManagerAccount ? (
            <div className="mt-3 space-y-1 text-sm font-semibold text-text-muted">
              <p className="font-black text-text-strong">
                {activeManagerAccount.business_name}
              </p>
              <p>{activeManagerAccount.bank_name}</p>
              <p>{activeManagerAccount.account_name}</p>
              <p>{maskAccountNumber(activeManagerAccount.account_number)}</p>
              <p>Confirmed: {formatDate(activeManagerAccount.verified_at)}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
              No active manager payout account saved yet.
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-black text-text-strong">
            Landlord accounts
          </p>

          {activeLandlordAccounts.length > 0 ? (
            <div className="mt-3 divide-y divide-border-soft">
              {activeLandlordAccounts.map((account) => (
                <article key={account.id} className="py-3">
                  <p className="text-sm font-black text-text-strong">
                    {landlordNameById.get(account.landlord_client_id) ??
                      account.business_name}
                  </p>
                  <div className="mt-1 space-y-1 text-sm font-semibold text-text-muted">
                    <p>{account.bank_name}</p>
                    <p>{account.account_name}</p>
                    <p>{maskAccountNumber(account.account_number)}</p>
                    <p>Confirmed: {formatDate(account.verified_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
              No active landlord payout account saved yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
