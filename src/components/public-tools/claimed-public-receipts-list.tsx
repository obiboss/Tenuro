import Link from "next/link";
import { FileText, ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicGeneratedReceiptRow } from "@/server/repositories/public-tool-leads.repository";

type ClaimedPublicReceiptsListProps = {
  receipts: PublicGeneratedReceiptRow[];
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function getPropertyLabel(receipt: PublicGeneratedReceiptRow) {
  return [
    receipt.property_name,
    receipt.unit_identifier,
    receipt.property_address,
    receipt.city_state,
  ]
    .filter(Boolean)
    .join(", ");
}

function getPaymentMethodLabel(
  method: PublicGeneratedReceiptRow["payment_method"],
) {
  if (method === "bank_transfer") {
    return "Bank Transfer";
  }

  if (method === "cash") {
    return "Cash";
  }

  if (method === "paystack_gateway") {
    return "Paystack";
  }

  return "Other";
}

export function ClaimedPublicReceiptsList({
  receipts,
}: ClaimedPublicReceiptsListProps) {
  if (receipts.length === 0) {
    return (
      <EmptyState
        title="No imported receipts yet"
        description="Receipts created from the public receipt generator will appear here after the landlord creates an account from the receipt."
        icon={<ReceiptText aria-hidden="true" size={24} strokeWidth={2.6} />}
        action={
          <Link href="/receipt-generator">
            <Button variant="secondary">Open Receipt Generator</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {receipts.map((receipt) => (
        <article
          key={receipt.id}
          className="rounded-card border border-border-soft bg-background p-4 md:p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <FileText aria-hidden="true" size={22} strokeWidth={2.6} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-all font-black text-text-strong">
                    {receipt.receipt_number}
                  </h2>
                  <Badge tone="success">Imported</Badge>
                </div>

                <p className="mt-1 text-sm leading-6 text-text-muted">
                  {receipt.tenant_full_name} · {getPropertyLabel(receipt)}
                </p>
              </div>
            </div>

            <p className="text-xl font-black text-text-strong">
              {formatMoney(Number(receipt.rent_amount))}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-button bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Payment Date
              </p>
              <p className="mt-1 font-black text-text-strong">
                {formatDate(receipt.payment_date)}
              </p>
            </div>

            <div className="rounded-button bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Rent Period
              </p>
              <p className="mt-1 font-black text-text-strong">
                {formatDate(receipt.rent_period_start)} -{" "}
                {formatDate(receipt.rent_period_end)}
              </p>
            </div>

            <div className="rounded-button bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Method
              </p>
              <p className="mt-1 font-black text-text-strong">
                {getPaymentMethodLabel(receipt.payment_method)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
            This imported receipt is attached to your account for review. It has
            not yet been posted into the rent ledger.
          </div>
        </article>
      ))}
    </div>
  );
}
