import { formatNairaCompact } from "@/server/utils/money";
import { cn } from "@/lib/cn";

type CaretakerSummaryCardsProps = {
  dueSoonCount: number;
  owingCount: number;
  pendingConfirmationCount: number;
  paidCount: number;
  totalOutstanding: number;
};

type CompactStatProps = {
  title: string;
  value: string;
  description: string;
  tone: "success" | "danger" | "warning" | "primary";
};

const toneStyles = {
  success: "border-success/20 bg-success-soft/40",
  danger: "border-danger/20 bg-danger-soft/40",
  warning: "border-warning/20 bg-warning-soft/40",
  primary: "border-primary/20 bg-primary-soft/40",
};

function CompactStat({ title, value, description, tone }: CompactStatProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border px-2 py-2 text-center",
        toneStyles[tone],
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-text-muted">
        {title}
      </p>
      <p className="mt-0.5 text-xl font-black leading-none text-text-strong">
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] font-semibold leading-tight text-text-muted">
        {description}
      </p>
    </div>
  );
}

export function CaretakerSummaryCards({
  dueSoonCount,
  owingCount,
  pendingConfirmationCount,
  paidCount,
  totalOutstanding,
}: CaretakerSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <CompactStat
        title="Due Soon"
        value={String(dueSoonCount)}
        description="Next 30 days"
        tone="warning"
      />

      <CompactStat
        title="Owing"
        value={String(owingCount)}
        description={
          totalOutstanding > 0
            ? formatNairaCompact(totalOutstanding)
            : "No balance"
        }
        tone="danger"
      />

      <CompactStat
        title="Pending"
        value={String(pendingConfirmationCount)}
        description="Confirmation"
        tone="primary"
      />

      <CompactStat
        title="Paid"
        value={String(paidCount)}
        description="Up to date"
        tone="success"
      />
    </div>
  );
}
