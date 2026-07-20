import Link from "next/link";
import {
  BellRing,
  Building2,
  CreditCard,
  ReceiptText,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { OverviewPrimaryAction } from "@/server/services/rent-control-overview.service";

type OverviewActionButtonsProps = {
  primaryAction: OverviewPrimaryAction;
};

type OverviewEmptyStateActionsProps = {
  step: "property" | "tenant";
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
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        const isPrimary = primaryAction === action.id;

        return (
          <Link
            key={action.id}
            href={action.href}
            className={cn(
              "block rounded-xl border px-2 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isPrimary
                ? "border-primary bg-primary text-white shadow-soft"
                : "border-border-soft bg-white text-text-strong hover:bg-background",
            )}
          >
            <span
              className={cn(
                "flex min-h-10 flex-col items-center justify-center gap-1 text-center text-xs font-extrabold sm:text-sm",
                isPrimary ? "text-white" : "text-text-strong",
              )}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={2.6} />
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function OverviewEmptyStateActions({
  step,
}: OverviewEmptyStateActionsProps) {
  const isPropertyStep = step === "property";
  const href = isPropertyStep ? "/properties/new" : "/tenants/new";
  const label = isPropertyStep ? "Add property" : "Add tenant";
  const Icon = isPropertyStep ? Building2 : UserPlus;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={href}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft"
      >
        <Icon aria-hidden="true" size={17} strokeWidth={2.6} />
        {label}
      </Link>
    </div>
  );
}

export function OverviewUpToDateActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/payments"
        className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-extrabold text-text-strong"
      >
        Send receipt
      </Link>
      <Link
        href="/tenants"
        className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-extrabold text-text-strong"
      >
        View all tenants
      </Link>
      <Link
        href="/tenants/new"
        className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-extrabold text-text-strong"
      >
        Add tenant
      </Link>
    </div>
  );
}
