import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

export default function AgentOnboardingPage() {
  return (
    <div>
      <PageHeader
        title="Tenant onboarding"
        description="Send onboarding links to tenants after landlord verification."
      />

      <SectionCard
        title="Tenant onboarding workflow"
        description="Batch 24E will connect agent tenant onboarding links here."
      >
        <div className="rounded-button bg-background p-4 text-sm leading-6 text-text-muted">
          Agent tenant onboarding becomes available after landlord property
          verification is implemented.
        </div>
      </SectionCard>
    </div>
  );
}
