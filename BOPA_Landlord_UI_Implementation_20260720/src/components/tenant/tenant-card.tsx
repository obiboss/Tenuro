import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { tryNormalisePhoneNumber } from "@/lib/phone";
import { buildTenantContactWhatsappMessage } from "@/lib/whatsapp-messages";
import { buildWaMeUrl } from "@/lib/whatsapp";
import type { TenantPipelineStatus } from "@/lib/tenant-pipeline-status";
import { TENANT_ONBOARDING_STATUS_COPY } from "@/lib/status-copy";
import type { TenantListRow } from "@/server/repositories/tenants.repository";

type TenantCardProps = {
  tenant: TenantListRow;
  pipelineStatus?: TenantPipelineStatus;
};

export function TenantCard({ tenant, pipelineStatus }: TenantCardProps) {
  const fallbackStatus =
    TENANT_ONBOARDING_STATUS_COPY[tenant.onboarding_status] ??
    TENANT_ONBOARDING_STATUS_COPY.invited;

  const status = pipelineStatus ?? fallbackStatus;
  const propertyUnitLabel = `${tenant.units?.properties?.property_name ?? "Property"} — ${tenant.units?.unit_identifier ?? "Unit"}`;
  const normalizedPhone = tryNormalisePhoneNumber(tenant.phone_number);
  const whatsappUrl = normalizedPhone
    ? buildWaMeUrl({
        phoneNumber: tenant.phone_number,
        message: buildTenantContactWhatsappMessage({
          tenantName: tenant.full_name,
          propertyUnitLabel,
        }),
      })
    : null;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold text-text-strong">
                {tenant.full_name}
              </h2>
              <p className="mt-0.5 truncate text-sm font-semibold text-text-muted">
                {propertyUnitLabel}
              </p>
            </div>

            <Badge tone={status.tone}>{status.label}</Badge>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-text-muted">
              <Phone aria-hidden="true" size={15} strokeWidth={2.5} />
              <span className="truncate">{tenant.phone_number}</span>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Message ${tenant.full_name} on WhatsApp`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition hover:bg-primary hover:text-white"
                >
                  <MessageCircle
                    aria-hidden="true"
                    size={14}
                    strokeWidth={2.6}
                  />
                </a>
              ) : null}
            </div>

            <Link
              href={`/tenants/${tenant.id}`}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-button bg-surface px-4 py-2 text-xs font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View tenant
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
