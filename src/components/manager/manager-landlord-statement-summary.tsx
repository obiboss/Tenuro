import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type StatementSummary = {
  landlordClient: ManagerLandlordClientRow;
  totalRentRecorded: number;
  managerCommission: number;
  amountDueToLandlord: number;
  amountRemitted: number;
  pendingLandlordBalance: number;
  pendingConfirmationAmount: number;
  rentPaymentCount: number;
  remittanceCount: number;
};

type ManagerLandlordStatementSummaryProps = {
  summary: StatementSummary;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function ManagerLandlordStatementSummary({
  summary,
}: ManagerLandlordStatementSummaryProps) {
  const cards = [
    {
      label: "Total rent recorded",
      value: formatNaira(summary.totalRentRecorded),
    },
    {
      label: "Manager commission",
      value: formatNaira(summary.managerCommission),
    },
    {
      label: "Amount due to landlord",
      value: formatNaira(summary.amountDueToLandlord),
    },
    {
      label: "Amount remitted",
      value: formatNaira(summary.amountRemitted),
    },
    {
      label: "Pending landlord balance",
      value: formatNaira(summary.pendingLandlordBalance),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
          Statement for
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
          {summary.landlordClient.landlord_name}
        </h2>

        <div className="mt-3 grid gap-2 text-sm font-semibold text-text-muted sm:grid-cols-2">
          <p>Phone: {summary.landlordClient.landlord_phone ?? "Not added"}</p>
          <p>Email: {summary.landlordClient.landlord_email ?? "Not added"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-card border border-border-soft bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
              {card.label}
            </p>
            <p className="mt-2 text-xl font-black tracking-tight text-text-strong">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {summary.pendingConfirmationAmount > 0 ? (
        <div className="rounded-card border border-warning/20 bg-warning-soft p-4">
          <p className="text-sm font-black text-text-strong">
            Pending confirmation
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            {formatNaira(summary.pendingConfirmationAmount)} is linked to
            payments awaiting confirmation. It is not yet included in the amount
            due to the landlord.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Rent payment records
          </p>
          <p className="mt-1 text-2xl font-black text-text-strong">
            {summary.rentPaymentCount.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Remittance records
          </p>
          <p className="mt-1 text-2xl font-black text-text-strong">
            {summary.remittanceCount.toLocaleString("en-NG")}
          </p>
        </div>
      </div>
    </section>
  );
}
