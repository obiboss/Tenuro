import { FileText, Receipt } from "lucide-react";
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

function getToolLabel(tool: PlatformAdminFreeToolUsageItem["tool"]) {
  return tool === "receipt"
    ? "Free Receipt Generator"
    : "Free Tenancy Agreement Generator";
}

function getDocumentLabel(item: PlatformAdminFreeToolUsageItem) {
  if (!item.documentId) {
    return null;
  }

  const shortId = item.documentId.slice(0, 8).toUpperCase();

  return item.tool === "receipt"
    ? `Receipt ${shortId}`
    : `Agreement ${shortId}`;
}

function ToolIcon({
  tool,
}: {
  tool: PlatformAdminFreeToolUsageItem["tool"];
}) {
  if (tool === "receipt") {
    return <Receipt aria-hidden="true" size={20} strokeWidth={2.6} />;
  }

  return <FileText aria-hidden="true" size={20} strokeWidth={2.6} />;
}

export function AdminFreeToolUsage({
  usage,
  periodLabel,
}: AdminFreeToolUsageProps) {
  const items = usage ?? [];

  return (
    <SectionCard
      title="Free tool usage"
      description={`People who used the free receipt or tenancy agreement generator during ${periodLabel.toLowerCase()}.`}
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
        items.map((item) => {
          const documentLabel = getDocumentLabel(item);

          return (
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
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-text-strong">
                          {item.userName}
                        </h3>

                        <Badge tone={item.tool === "receipt" ? "success" : "neutral"}>
                          {getToolLabel(item.tool)}
                        </Badge>

                        <Badge tone="neutral">{item.accountLabel}</Badge>
                      </div>

                      <p className="mt-2 text-sm font-bold text-text-strong">
                        {item.actionLabel}
                      </p>
                    </div>

                    <p className="shrink-0 text-xs font-bold text-text-muted">
                      {formatTimestamp(item.createdAt)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-text-muted">
                    {item.phoneNumber ? (
                      <span>{item.phoneNumber}</span>
                    ) : null}

                    {item.email ? <span>{item.email}</span> : null}

                    {documentLabel ? <span>{documentLabel}</span> : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}
    </SectionCard>
  );
}
