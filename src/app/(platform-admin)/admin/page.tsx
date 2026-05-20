import { CreditCard, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { requirePlatformAdminPage } from "@/server/services/platform-admin.service";

export default async function PlatformAdminDashboardPage() {
  await requirePlatformAdminPage();

  return (
    <div>
      <PageHeader
        eyebrow="Platform Operations"
        title="Admin dashboard"
        description="Internal tools for payment operations oversight, payout verification, and platform safety checks."
        action={<Badge tone="success">Protected</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <LayoutDashboard aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>

            <div>
              <p className="text-sm font-bold text-text-muted">Dashboard</p>
              <p className="mt-1 font-black text-text-strong">Ready</p>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                The admin shell and server-side route guard are active.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
              <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>

            <div>
              <p className="text-sm font-bold text-text-muted">Authorization</p>
              <p className="mt-1 font-black text-text-strong">Centralized</p>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                Admin pages and future actions can reuse one platform guard.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning">
              <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>

            <div>
              <p className="text-sm font-bold text-text-muted">
                Payout verification
              </p>
              <p className="mt-1 font-black text-text-strong">Next batch</p>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                The navigation slot exists; queue data and mutations are not
                implemented in this foundation batch.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Operational boundary"
          description="This foundation keeps admin access explicit before any payout verification tools are added."
        >
          <div className="space-y-4 text-sm leading-6 text-text-muted">
            <p>
              Platform admin access is enforced on the server before the admin
              layout renders. Non-admin authenticated users do not receive an
              admin surface.
            </p>

            <p>
              Future payout verification pages and actions should call the same
              platform admin guard before reading or mutating admin-only data.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Available tools"
          description="Only the foundation shell is available in this batch."
        >
          <div className="space-y-3">
            <div className="rounded-button bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-extrabold text-text-strong">Dashboard</p>
                <Badge tone="success">Active</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Confirms admin routing, layout, and guard wiring.
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-extrabold text-text-strong">
                  Payment Operations
                </p>
                <Badge tone="success">Active</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Monitor gateway payments, failures, and allocation issues.
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-extrabold text-text-strong">
                  Payout Verifications
                </p>
                <Badge tone="success">Active</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Review landlord and agent payout accounts before split payouts.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
