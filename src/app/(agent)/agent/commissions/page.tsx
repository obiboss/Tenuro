import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

export default function AgentCommissionsPage() {
  return (
    <div>
      <PageHeader
        title="Commissions"
        description="Track agent commission readiness and payout settlement."
      />

      <SectionCard
        title="Commission settlement"
        description="Batch 24G will add multi-party payment split tracking here."
      >
        <div className="rounded-button bg-background p-4 text-sm leading-6 text-text-muted">
          Your payout account must be connected before agent commission split
          payments can be activated.
        </div>
      </SectionCard>
    </div>
  );
}
