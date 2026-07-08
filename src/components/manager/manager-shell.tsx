"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { managerSignOutAction } from "@/actions/manager-auth.actions";
import { cn } from "@/lib/cn";
import {
  MANAGER_STAFF_ROLE_LABELS,
  canManagerRoleAccessPath,
} from "@/lib/manager-staff-permission";
import type { ManagerWorkspaceRole } from "@/server/repositories/manager-staff.repository";

type ManagerShellProps = {
  children: ReactNode;
  managerName: string;
  organizationName?: string | null;
  staffRole: ManagerWorkspaceRole;
};

const navItems = [
  {
    label: "Overview",
    href: "/manager/overview",
  },
  {
    label: "Landlords",
    href: "/manager/landlords",
  },
  {
    label: "Properties",
    href: "/manager/properties",
  },
  {
    label: "Tenants",
    href: "/manager/tenants",
  },
  {
    label: "Payments",
    href: "/manager/payments",
  },
  {
    label: "Payouts",
    href: "/manager/payouts",
  },
  {
    label: "Remittances",
    href: "/manager/remittances",
  },
  {
    label: "Reports",
    href: "/manager/reports",
  },
  {
    label: "Maintenance",
    href: "/manager/maintenance",
  },
  {
    label: "Staff",
    href: "/manager/staff",
  },
  {
    label: "Settings",
    href: "/manager/settings",
  },
] as const;

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Manager";
}

function BoldverseManagerBrand() {
  return (
    <Link
      href="/manager/overview"
      prefetch={false}
      className="flex min-w-0 items-center gap-3"
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div className="min-w-0">
        <p className="truncate text-lg font-extrabold tracking-tight text-text-strong">
          BOPA Manager
        </p>
        <p className="truncate text-xs font-semibold text-text-muted">
          Property management workspace
        </p>
      </div>
    </Link>
  );
}

export function ManagerShell({
  children,
  managerName,
  organizationName,
  staffRole,
}: ManagerShellProps) {
  const pathname = usePathname();
  const firstName = getFirstName(managerName);
  const visibleNavItems = navItems.filter((item) =>
    canManagerRoleAccessPath(staffRole, item.href),
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border-soft bg-white px-5 py-6 lg:block">
        <BoldverseManagerBrand />

        <nav className="mt-8 space-y-2">
          {visibleNavItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center rounded-button px-4 text-sm font-extrabold transition",
                  active
                    ? "bg-primary text-white shadow-soft"
                    : "text-text-muted hover:bg-primary-soft hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border-soft bg-white/95 px-4 py-4 backdrop-blur md:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="lg:hidden">
              <BoldverseManagerBrand />
            </div>

            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-text-muted">
                Welcome back,
              </p>
              <h1 className="text-lg font-black tracking-tight text-text-strong">
                {firstName}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-extrabold text-text-strong">
                  {organizationName ?? "Manager setup"}
                </p>
                <p className="text-xs font-semibold text-text-muted">
                  {MANAGER_STAFF_ROLE_LABELS[staffRole]}
                </p>
              </div>

              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                {MANAGER_STAFF_ROLE_LABELS[staffRole]}
              </span>

              <form action={managerSignOutAction}>
                <button
                  type="submit"
                  className="min-h-10 rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 pb-28 md:px-6 lg:pb-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile manager navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-white px-2 py-2 shadow-2xl lg:hidden"
      >
        <div className="flex gap-1 overflow-x-auto pb-1">
          {visibleNavItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-24 items-center justify-center rounded-2xl px-3 py-3 text-xs font-bold transition",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-text-muted hover:bg-primary-soft hover:text-primary",
                )}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
