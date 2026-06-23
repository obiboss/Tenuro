import Link from "next/link";
import {
  BellRing,
  ClipboardList,
  FileQuestion,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CaretakerPrimaryAction } from "@/server/services/caretaker-overview.service";

type CaretakerActionButtonsProps = {
  primaryAction: CaretakerPrimaryAction;
};

const actions = [
  {
    id: "send_reminder" as const,
    label: "Send reminder",
    href: "#rent-due-soon",
    icon: BellRing,
  },
  {
    id: "call_tenant" as const,
    label: "Call tenant",
    href: "#rent-due-soon",
    icon: Phone,
  },
  {
    id: "request_proof" as const,
    label: "Request proof",
    href: "#owing-overdue",
    icon: FileQuestion,
  },
  {
    id: "report_payment" as const,
    label: "Report payment",
    href: "#owing-overdue",
    icon: ClipboardList,
  },
];

export function CaretakerActionButtons({
  primaryAction,
}: CaretakerActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        const isPrimary =
          primaryAction === action.id ||
          (primaryAction === "send_reminder" && action.id === "send_reminder") ||
          (primaryAction === "request_proof" &&
            (action.id === "request_proof" || action.id === "report_payment"));

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

export function CaretakerUpToDateActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="#paid-tenants"
        className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-extrabold text-text-strong"
      >
        View all tenants
      </Link>
    </div>
  );
}
