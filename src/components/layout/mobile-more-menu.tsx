"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, ShieldCheck, Settings, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const moreItems = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    status: "available",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    status: "coming_soon",
  },
  {
    label: "Caretakers",
    href: "/caretakers",
    icon: ShieldCheck,
    status: "coming_soon",
  },
];

export function MobileMoreMenu() {
  const [isOpen, setIsOpen] = useState(false);

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

          <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-text-strong">
                  More
                </h2>
                <p className="text-sm text-text-muted">
                  Extra Tenuro tools and settings.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                <X aria-hidden="true" size={20} strokeWidth={2.6} />
              </Button>
            </div>

            <div className="space-y-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const comingSoon = item.status === "coming_soon";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-card border border-border-soft bg-surface p-4 transition",
                      "hover:border-primary/30 hover:bg-primary-soft",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                        <Icon aria-hidden="true" size={22} strokeWidth={2.6} />
                      </span>

                      <span>
                        <span className="block font-extrabold text-text-strong">
                          {item.label}
                        </span>
                        <span className="text-sm text-text-muted">
                          {comingSoon
                            ? "This section is not active yet."
                            : "Manage your account setup."}
                        </span>
                      </span>
                    </span>

                    {comingSoon ? <Badge tone="warning">Soon</Badge> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
