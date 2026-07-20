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
        "min-w-0 rounded-card border px-3 py-4 md:px-5 md:py-5",
        toneStyles[tone],
      )}
    >
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-black leading-none text-text-strong md:text-3xl">
          {value}
        </p>
        <p className="text-xs font-black text-text-strong md:text-base">
          {title}
        </p>
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-text-muted md:text-sm">
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
        description="Rent is up to date"
        tone="success"
      />

      <CompactStat
        title="Due soon"
        value={String(dueSoonCount)}
        description="Within the next 30 days"
        tone="warning"
      />

      <CompactStat
        title="Owing"
        value={String(owingCount)}
        description={
          totalOutstanding > 0
            ? `${formatNairaCompact(totalOutstanding)} outstanding`
            : "No unpaid rent"
        }
        tone="danger"
      />
    </div>
  );
}
