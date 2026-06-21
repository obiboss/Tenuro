import {
  CalendarClock,
  CircleCheck,
  CircleDollarSign,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatNairaCompact } from "@/server/utils/money";

type OverviewSummaryCardsProps = {
  paidCount: number;
  owingCount: number;
  dueSoonCount: number;
  totalOutstanding: number;
};

export function OverviewSummaryCards({
  paidCount,
  owingCount,
  dueSoonCount,
  totalOutstanding,
}: OverviewSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        title="Paid"
        value={String(paidCount)}
        description="Up to date"
        tone="success"
        icon={<CircleCheck size={22} strokeWidth={2.6} />}
      />

      <StatCard
        title="Owing"
        value={String(owingCount)}
        description={
          totalOutstanding > 0
            ? formatNairaCompact(totalOutstanding)
            : "No outstanding balance"
        }
        tone="danger"
        icon={<CircleDollarSign size={22} strokeWidth={2.6} />}
      />

      <StatCard
        title="Due Soon"
        value={String(dueSoonCount)}
        description="Within 30 days"
        tone="warning"
        icon={<CalendarClock size={22} strokeWidth={2.6} />}
      />
    </div>
  );
}
