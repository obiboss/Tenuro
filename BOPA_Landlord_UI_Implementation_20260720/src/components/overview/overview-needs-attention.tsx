import Link from "next/link";
import { CreditCard } from "lucide-react";
import { ReceiptWhatsAppButton } from "@/components/payment/receipt-whatsapp-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WhatsAppSendButton } from "@/components/ui/whatsapp-send-button";
import { formatNaira } from "@/server/utils/money";
import type { OverviewNeedsAttentionItem } from "@/server/services/rent-control-overview.service";
import { cn } from "@/lib/cn";

type OverviewNeedsAttentionListProps = {
  items: OverviewNeedsAttentionItem[];
};

function formatDueDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function NeedsAttentionRow({ item }: { item: OverviewNeedsAttentionItem }) {
  const showRentActions =
    item.attentionReason === "overdue" ||
    item.attentionReason === "owing" ||
    item.attentionReason === "due_soon";

  return (
    <article
      className={cn(
        "rounded-card border border-l-4 bg-white p-4",
        item.attentionReason === "receipt_pending"
          ? "border-border-soft border-l-primary"
          : item.attentionReason === "due_soon"
            ? "border-warning/20 border-l-warning"
            : "border-danger/20 border-l-danger",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black text-text-strong">
            {item.attentionReason === "receipt_pending"
              ? "Receipt ready to send"
              : item.attentionReason === "due_soon"
                ? item.statusLabel
                : "Rent is overdue"}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {item.tenantName} · {item.propertyUnitLabel}
          </p>
        </div>

        <Badge tone={item.badgeTone}>{item.statusLabel}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-bold text-text-muted">
          Rent: {formatNaira(item.rentAmount)}
        </span>

        {item.amountOwed !== null ? (
          <span className="font-black text-danger">
            Owes {formatNaira(item.amountOwed)}
          </span>
        ) : null}

        {item.dueDate ? (
          <span className="font-bold text-text-muted">
            Due {formatDueDate(item.dueDate)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(11rem,auto)_minmax(11rem,auto)] sm:justify-end">
        {showRentActions ? (
          <>
            <WhatsAppSendButton
              phoneNumber={item.phoneNumber}
              message={item.whatsappMessage}
              label="Send reminder"
            />

            {(item.attentionReason === "overdue" ||
              item.attentionReason === "owing") && (
              <Link href="/payments" className="block">
                <Button type="button" variant="secondary" fullWidth>
                  <CreditCard aria-hidden="true" size={16} strokeWidth={2.6} />
                  Record payment
                </Button>
              </Link>
            )}
          </>
        ) : null}

        {item.attentionReason === "receipt_pending" && item.paymentId ? (
          <div className="sm:col-span-2">
            <ReceiptWhatsAppButton
              paymentId={item.paymentId}
              label="Send receipt"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function OverviewNeedsAttentionList({
  items,
}: OverviewNeedsAttentionListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <NeedsAttentionRow
          key={
            item.paymentId
              ? `receipt-${item.paymentId}`
              : `tenancy-${item.tenancyId}`
          }
          item={item}
        />
      ))}
    </div>
  );
}
