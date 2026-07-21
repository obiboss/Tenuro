import { AdminActivityView } from "@/components/platform-admin/admin-activity-view";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPlatformAdminActivity,
  parseActivityModule,
  parseActivityOutcome,
  parseActivityPeriod,
} from "@/server/services/platform-admin-activity.service";

type PlatformAdminActivityPageProps = {
  searchParams: Promise<{
    module?: string;
    outcome?: string;
    period?: string;
    search?: string;
  }>;
};

export default async function PlatformAdminActivityPage({
  searchParams,
}: PlatformAdminActivityPageProps) {
  const params = await searchParams;
  const filters = {
    module: parseActivityModule(params.module),
    outcome: parseActivityOutcome(params.outcome),
    periodDays: parseActivityPeriod(params.period),
    search: params.search?.trim().slice(0, 100) || undefined,
  };
  const activity = await getPlatformAdminActivity(filters);

  return (
    <div>
      <PageHeader
        eyebrow="Platform Operations"
        title="Activity"
        description="See what happened across BOPA, who performed it, whether it succeeded, and which sign-ups or onboarding journeys remain unfinished."
        action={<Badge tone="success">Protected</Badge>}
      />

      <AdminActivityView
        filters={filters}
        events={activity.events}
        journeys={activity.journeys}
        summary={activity.summary}
      />
    </div>
  );
}
