import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export default async function DeveloperDashboardPage() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Developer Dashboard"
        description="Manage estate projects, plot sales, buyers, payment plans, and title document readiness from one workspace."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Developer Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-text-strong">
              {account?.company_name ?? "Not configured"}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Plan: {account?.subscription_plan ?? "starter"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-text-strong">0</p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Estate setup starts in Batch D2.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-text-strong">0</p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Buyer onboarding starts in Batch D3.
            </p>
          </CardContent>
        </Card>
      </div>

      <SectionCard
        title="D1 foundation complete"
        description="This developer workspace is intentionally isolated from BOPA landlord, tenant, and agent routes."
      >
        <div className="rounded-button bg-primary-soft p-4 text-sm font-semibold leading-6 text-primary">
          Next batch: D2 — Estate + Plot Inventory.
        </div>
      </SectionCard>
    </div>
  );
}
