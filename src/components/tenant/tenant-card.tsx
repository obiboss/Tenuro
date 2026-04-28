import Link from "next/link";
import { Phone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TENANT_ONBOARDING_STATUS_COPY } from "@/lib/status-copy";
import type { TenantListRow } from "@/server/repositories/tenants.repository";

type TenantCardProps = {
  tenant: TenantListRow;
};

export function TenantCard({ tenant }: TenantCardProps) {
  const status =
    TENANT_ONBOARDING_STATUS_COPY[tenant.onboarding_status] ??
    TENANT_ONBOARDING_STATUS_COPY.invited;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <UserRound aria-hidden="true" size={24} strokeWidth={2.6} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-text-strong">
                {tenant.full_name}
              </h2>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                {tenant.units?.properties?.property_name ?? "Property not set"}{" "}
                — {tenant.units?.unit_identifier ?? "Unit not set"}
              </p>
            </div>

            <Badge tone={status.tone}>{status.label}</Badge>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-muted">
              <Phone aria-hidden="true" size={18} strokeWidth={2.5} />
              {tenant.phone_number}
            </div>

            <Link
              href={`/tenants/${tenant.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-semibold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View Tenant
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
