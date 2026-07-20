import {
  FileText,
  Mail,
  Phone,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import type { PlatformAdminFreeToolUsageItem } from "@/server/services/platform-admin-dashboard.service";

type AdminFreeToolUsageProps = {
  usage: PlatformAdminFreeToolUsageItem[];
  periodLabel: string;
};

function formatTimestamp(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(parsed));
}

function ToolIcon({
  tool,
}: {
  tool: PlatformAdminFreeToolUsageItem["tool"];
}) {
  if (tool === "receipt") {
    return <ReceiptText aria-hidden="true" size={20} strokeWidth={2.6} />;
  }

  return <FileText aria-hidden="true" size={20} strokeWidth={2.6} />;
}

function getToolLabel(tool: PlatformAdminFreeToolUsageItem["tool"]) {
  return tool === "receipt" ? "Free receipt" : "Tenancy agreement";
}

function getAccountStatusLabel(
  status: PlatformAdminFreeToolUsageItem["accountStatus"],
) {
  return status === "bopa_account" ? "BOPA account" : "Visitor";
}

export function AdminFreeToolUsage({
  usage,
  periodLabel,
}: AdminFreeToolUsageProps) {
  const items = usage ?? [];

  return (
    <SectionCard
      title="Free tool usage"
      description={`People who used the free receipt and tenancy agreement generators during ${periodLabel.toLowerCase()}.`}
      contentClassName="space-y-3"
    >
      {items.length === 0 ? (
        <EmptyState
          title="No free tool usage"
          description="New receipt and tenancy agreement generator activity will appear here."
          icon={<FileText aria-hidden="true" size={24} strokeWidth={2.6} />}
          className="bg-background shadow-none"
        />
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className="rounded-card border border-border-soft bg-background p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ToolIcon tool={item.tool} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-text-strong">
                        {item.personName}
                      </h3>
                      <Badge tone="neutral">{getToolLabel(item.tool)}</Badge>
                      <Badge
                        tone={
                          item.accountStatus === "bopa_account"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {getAccountStatusLabel(item.accountStatus)}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm font-bold text-text-strong">
                      {item.actionLabel}
                    </p>
                  </div>

                  <p className="shrink-0 text-xs font-bold text-text-muted">
                    {formatTimestamp(item.createdAt)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted">
                  {item.phoneNumber ? (
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <Phone aria-hidden="true" size={15} strokeWidth={2.5} />
                      {item.phoneNumber}
                    </span>
                  ) : null}

                  {item.email ? (
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <Mail aria-hidden="true" size={15} strokeWidth={2.5} />
                      {item.email}
                    </span>
                  ) : null}

                  {!item.phoneNumber && !item.email ? (
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <UserRound
                        aria-hidden="true"
                        size={15}
                        strokeWidth={2.5}
                      />
                      Contact details unavailable
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-col gap-1 border-t border-border-soft pt-3 text-xs font-semibold text-text-muted sm:flex-row sm:items-center sm:justify-between">
                  <span>{item.documentReference}</span>
                  <span>{item.sourcePath || "Public generator"}</span>
                </div>
              </div>
            </div>
          </article>
        ))
      )}
    </SectionCard>
  );
}
