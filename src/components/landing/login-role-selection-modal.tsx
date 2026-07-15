"use client";

import Link from "next/link";
import { useEffect, useId } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Landmark,
  UserRoundCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type LoginRoleOption = {
  title: string;
  description: string;
  href: string;
  icon: typeof Building2;
  tone: "primary" | "success" | "gold" | "warning";
};

const loginRoles: LoginRoleOption[] = [
  {
    title: "Landlord",
    description: "Manage your properties and tenants",
    href: "/login",
    icon: Building2,
    tone: "primary",
  },
  {
    title: "Agent",
    description: "View and manage your assigned listings",
    href: "/agent/login",
    icon: UserRoundCheck,
    tone: "success",
  },
  {
    title: "Property Manager",
    description: "Email and password — multi-staff access",
    href: "/manager/login",
    icon: BriefcaseBusiness,
    tone: "gold",
  },
  {
    title: "Real Estate Developer",
    description: "Manage estates, buyers, plots, payments, and documents",
    href: "/developer/login",
    icon: Landmark,
    tone: "warning",
  },
];

const iconTones: Record<LoginRoleOption["tone"], string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  gold: "bg-gold-soft text-gold-deep",
  warning: "bg-warning-soft text-warning",
};

type LoginRoleSelectionModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginRoleSelectionModal({
  open,
  onClose,
}: LoginRoleSelectionModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close login options"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-hidden rounded-4xl bg-background p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-extrabold tracking-tight text-text-strong"
            >
              Welcome back
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Choose how you&apos;re logging in
            </p>
          </div>

          <Button type="button" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" size={20} strokeWidth={2.6} />
          </Button>
        </div>

        <div className="mt-5 max-h-[calc(100vh-10rem)] space-y-3 overflow-y-auto pr-1">
          {loginRoles.map((role) => {
            const Icon = role.icon;

            return (
              <Link
                key={role.href}
                href={role.href}
                onClick={onClose}
                className="group flex items-center gap-4 rounded-card border border-border-soft bg-surface p-4 transition hover:border-primary/40 hover:bg-primary-soft/40"
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                    iconTones[role.tone],
                  )}
                  aria-hidden="true"
                >
                  <Icon size={22} strokeWidth={2.6} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold tracking-tight text-text-strong">
                    {role.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-text-muted">
                    {role.description}
                  </p>
                </div>

                <ArrowRight
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2.6}
                  className="shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
