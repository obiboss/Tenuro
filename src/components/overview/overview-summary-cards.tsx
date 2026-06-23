import { formatNairaCompact } from "@/server/utils/money";
import { cn } from "@/lib/cn";

type OverviewSummaryCardsProps = {
  paidCount: number;
  owingCount: number;
  dueSoonCount: number;
  totalOutstanding: number;
};

type CompactStatProps = {
  title: string;
  value: string;
  description: string;
  tone: "success" | "danger" | "warning";
};

const toneStyles = {
  success: "border-success/20 bg-success-soft/40",
  danger: "border-danger/20 bg-danger-soft/40",
  warning: "border-warning/20 bg-warning-soft/40",
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

export function OverviewSummaryCards({
  paidCount,
  owingCount,
  dueSoonCount,
  totalOutstanding,
}: OverviewSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <CompactStat
        title="Paid"
        value={String(paidCount)}
        description="Up to date"
        tone="success"
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
        title="Due Soon"
        value={String(dueSoonCount)}
        description="30 days"
        tone="warning"
      />
    </div>
  );
}
