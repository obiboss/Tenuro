"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Landmark,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  UserCog,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { managerSignOutAction } from "@/actions/manager-auth.actions";
import { ToastProvider } from "@/components/ui/toast-provider";
import { cn } from "@/lib/cn";
import {
  MANAGER_STAFF_ROLE_LABELS,
  canManagerRoleAccessPath,
} from "@/lib/manager-staff-permission";
import { isAggressiveWorkflowPrefetchAllowed } from "@/lib/workflow-prefetch-policy";
import type { ManagerWorkspaceRole } from "@/server/repositories/manager-staff.repository";

type ManagerShellProps = {
  children: ReactNode;
  managerName: string;
  organizationName?: string | null;
  staffRole: ManagerWorkspaceRole;
};

type ManagerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type ManagerNavSection = {
  label: string;
  items: ManagerNavItem[];
};

const navSections: ManagerNavSection[] = [
  {
    label: "Work",
    items: [
      {
        label: "Overview",
        href: "/manager/overview",
        icon: LayoutDashboard,
      },
      {
        label: "Properties",
        href: "/manager/properties",
        icon: Building2,
      },
      {
        label: "Tenants",
        href: "/manager/tenants",
        icon: UsersRound,
      },
      {
        label: "Payments",
        href: "/manager/payments",
        icon: ReceiptText,
      },
      {
        label: "Maintenance",
        href: "/manager/maintenance",
        icon: Wrench,
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Payouts",
        href: "/manager/payouts",
        icon: WalletCards,
      },
      {
        label: "Remittances",
        href: "/manager/remittances",
        icon: Landmark,
      },
      {
        label: "Reports",
        href: "/manager/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        label: "Landlords",
        href: "/manager/landlords",
        icon: UserRound,
      },
      {
        label: "Staff",
        href: "/manager/staff",
        icon: UserCog,
      },
      {
        label: "Settings",
        href: "/manager/settings",
        icon: Settings,
      },
    ],
  },
];

function BoldverseManagerBrand() {
  return (
    <Link
      href="/manager/overview"
      prefetch={true}
      className="flex min-w-0 items-center gap-3"
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div className="min-w-0">
        <p className="truncate text-base font-extrabold tracking-tight text-text-strong">
          BOPA Manager
        </p>
        <p className="truncate text-xs font-semibold text-text-muted">
          Manager workspace
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
  const roleLabel = MANAGER_STAFF_ROLE_LABELS[staffRole];
  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canManagerRoleAccessPath(staffRole, item.href),
      ),
    }))
    .filter((section) => section.items.length > 0);
  const visibleMobileNavItems = visibleNavSections.flatMap(
    (section) => section.items,
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border-soft bg-white px-4 py-5 lg:block">
          <BoldverseManagerBrand />

          <nav className="mt-6 space-y-5" aria-label="Manager navigation">
            {visibleNavSections.map((section) => (
              <div key={section.label}>
                <p className="px-3 text-xs font-bold text-text-muted">
                  {section.label}
                </p>

                <div className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={
                          isAggressiveWorkflowPrefetchAllowed(item.href)
                            ? true
                            : false
                        }
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          active
                            ? "bg-primary-soft text-primary ring-1 ring-primary/10"
                            : "text-text-muted hover:bg-surface hover:text-text-strong",
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 border-b border-border-soft bg-white/95 px-4 py-2.5 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="lg:hidden">
                <BoldverseManagerBrand />
              </div>

              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-extrabold text-text-strong">
                  {organizationName ?? "Manager setup"}
                </p>
                <p className="text-xs font-semibold text-text-muted">
                  Manager workspace
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-extrabold text-text-strong">
                    {managerName}
                  </p>
                  <p className="text-xs font-semibold text-text-muted">
                    {roleLabel}
                  </p>
                </div>

                <form action={managerSignOutAction}>
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border-soft bg-white px-3 text-sm font-extrabold text-text-strong transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-5 pb-28 md:px-6 lg:pb-8">
            {children}
          </main>
        </div>

        <nav
          aria-label="Mobile manager navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-white px-2 py-2 shadow-2xl lg:hidden"
        >
          <div className="flex gap-1 overflow-x-auto pb-1">
            {visibleMobileNavItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={
                    isAggressiveWorkflowPrefetchAllowed(item.href)
                      ? true
                      : false
                  }
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-20 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-text-muted hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
