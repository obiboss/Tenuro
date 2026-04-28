import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function CaretakersPage() {
  return (
    <div>
      <PageHeader
        title="Caretakers"
        description="Invite caretakers and control what they can view or manage."
        action={<Badge tone="warning">Coming Soon</Badge>}
      />

      <EmptyState
        title="Caretaker access is coming soon"
        description="When this is active, you will be able to invite caretakers and assign them to specific properties."
        icon={<ShieldCheck aria-hidden="true" size={24} strokeWidth={2.6} />}
      />
    </div>
  );
}
