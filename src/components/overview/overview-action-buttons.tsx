import Link from "next/link";
import {
  BellRing,
  CreditCard,
  ReceiptText,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { OverviewPrimaryAction } from "@/server/services/rent-control-overview.service";

type OverviewActionButtonsProps = {
  primaryAction: OverviewPrimaryAction;
};

const actions = [
  {
    id: "send_reminder" as const,
    label: "Send reminder",
    href: "#needs-attention",
    icon: BellRing,
  },
  {
    id: "send_receipt" as const,
    label: "Send receipt",
    href: "/payments",
    icon: ReceiptText,
  },
  {
    id: "add_tenant" as const,
    label: "Add tenant",
    href: "/tenants/new",
    icon: UserPlus,
  },
  {
    id: "record_payment" as const,
    label: "Record payment",
    href: "/payments",
    icon: CreditCard,
  },
];

export function OverviewActionButtons({
  primaryAction,
}: OverviewActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        const isPrimary = primaryAction === action.id;

        return (
          <Link
            key={action.id}
            href={action.href}
            className={cn(
              "block rounded-card border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isPrimary
                ? "border-primary bg-primary text-white shadow-soft"
                : "border-border-soft bg-white text-text-strong hover:bg-background",
            )}
          >
            <span
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-2 text-center text-sm font-extrabold",
                isPrimary ? "text-white" : "text-text-strong",
              )}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function OverviewEmptyStateActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/tenants/new">
        <Button>Add tenant</Button>
      </Link>
    </div>
  );
}

export function OverviewUpToDateActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/payments">
        <Button variant="secondary">Send receipt</Button>
      </Link>
      <Link href="/tenants">
        <Button variant="secondary">View all tenants</Button>
      </Link>
      <Link href="/tenants/new">
        <Button variant="secondary">Add tenant</Button>
      </Link>
    </div>
  );
}
