import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

export default function AgentListingsPage() {
  return (
    <div>
      <PageHeader
        title="Agent listings"
        description="Submit and track landlord property listings from your agent workspace."
      />

      <SectionCard
        title="Property listing workflow"
        description="Batch 24C will add agent-initiated property listing here."
      >
        <div className="rounded-button bg-background p-4 text-sm leading-6 text-text-muted">
          Complete your agent profile and payout account setup first. Property
          submission starts in Batch 24C.
        </div>
      </SectionCard>
    </div>
  );
}
