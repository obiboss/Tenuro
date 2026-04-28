import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="View rent collection, outstanding balances, and property performance."
        action={<Badge tone="warning">Coming Soon</Badge>}
      />

      <EmptyState
        title="Reports are coming soon"
        description="Once reporting is active, Tenuro will show rent collected, outstanding balances, and useful property summaries here."
        icon={<BarChart3 aria-hidden="true" size={24} strokeWidth={2.6} />}
      />
    </div>
  );
}
