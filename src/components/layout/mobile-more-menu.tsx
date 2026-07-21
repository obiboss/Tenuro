"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FileText, Settings, ShieldCheck, X } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { isAggressiveWorkflowPrefetchAllowed } from "@/lib/workflow-prefetch-policy";

const moreItems = [
  {
    label: "Agreements",
    href: "/agreements",
    icon: FileText,
    description: "View or change your tenancy agreement.",
  },
  {
    label: "Caretakers",
    href: "/caretakers",
    icon: ShieldCheck,
    description: "Invite caretakers and manage property access.",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Manage your account setup.",
  },
] as const;

type MobileMoreMenuProps = {
  platformAccessLocked?: boolean;
};

export function MobileMoreMenu({
  platformAccessLocked = false,
}: MobileMoreMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  void platformAccessLocked;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold text-text-muted transition hover:bg-primary-soft hover:text-primary"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-border-soft text-text-muted">
          •••
        </span>
        More
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-4xl bg-white p-4 pb-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-text-strong">
                More
              </h2>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                <X aria-hidden="true" size={20} strokeWidth={2.6} />
              </Button>
            </div>

            <div className="space-y-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={
                      isAggressiveWorkflowPrefetchAllowed(
                        item.href,
                      )
                        ? undefined
                        : false
                    }
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-card border p-3 transition",
                      active
                        ? "border-primary/30 bg-primary-soft"
                        : "border-border-soft bg-surface hover:border-primary/30 hover:bg-primary-soft",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                          active
                            ? "bg-primary text-white"
                            : "bg-primary-soft text-primary",
                        )}
                      >
                        <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
                      </span>

                      <span className="min-w-0">
                        <span className="block font-extrabold text-text-strong">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs font-semibold text-text-muted">
                          {item.description}
                        </span>
                      </span>
                    </span>
                  </Link>
                );
              })}

              <div className="border-t border-border-soft pt-3">
                <LogoutButton className="w-full justify-center" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
