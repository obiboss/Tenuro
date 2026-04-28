import { RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function RenewalsPage() {
  return (
    <div>
      <PageHeader
        title="Renewals"
        description="Track rent expiry dates and renewal reminders."
        action={<Badge tone="warning">Coming Soon</Badge>}
      />

      <EmptyState
        title="Renewal tracking is coming soon"
        description="After the renewal engine is completed, tenants with upcoming rent expiry dates will appear here."
        icon={<RefreshCcw aria-hidden="true" size={24} strokeWidth={2.6} />}
      />
    </div>
  );
}
