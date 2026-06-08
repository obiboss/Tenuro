"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Home,
  Map,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { developerSignOutAction } from "@/actions/developer-auth.actions";
import { Badge } from "@/components/ui/badge";
import { ToastProvider } from "@/components/ui/toast-provider";
import { cn } from "@/lib/cn";

type DeveloperShellProps = {
  children: React.ReactNode;
  developerName: string;
  companyName?: string | null;
};

type DeveloperNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const desktopNavItems: readonly DeveloperNavItem[] = [
  {
    label: "Overview",
    href: "/developer",
    icon: Home,
  },
  {
    label: "Estates",
    href: "/developer/estates",
    icon: Building2,
  },
  {
    label: "Plots",
    href: "/developer/estates",
    icon: Map,
  },
  {
    label: "Buyers",
    href: "/developer/buyers",
    icon: Users,
    disabled: true,
  },
  {
    label: "Payments",
    href: "/developer/payments",
    icon: CreditCard,
    disabled: true,
  },
  {
    label: "Documents",
    href: "/developer/documents",
    icon: FileText,
    disabled: true,
  },
  {
    label: "Reports",
    href: "/developer/reports",
    icon: BarChart3,
    disabled: true,
  },
  {
    label: "Settings",
    href: "/developer/settings",
    icon: Settings,
    disabled: true,
  },
];

const mobilePrimaryItems: readonly DeveloperNavItem[] = [
  {
    label: "Home",
    href: "/developer",
    icon: Home,
  },
  {
    label: "Estates",
    href: "/developer/estates",
    icon: Building2,
  },
  {
    label: "Plots",
    href: "/developer/estates",
    icon: Map,
  },
];

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Developer";
}

function isActivePath(pathname: string, href: string) {
  if (href === "/developer") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function BoldverseBrand({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/developer" className="flex min-w-0 items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div className="min-w-0">
        <p className="truncate text-lg font-extrabold tracking-tight text-text-strong">
          Boldverse Property
        </p>
        <p className="truncate text-xs font-semibold text-text-muted">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

export function DeveloperShell({
  children,
  developerName,
  companyName,
}: DeveloperShellProps) {
  const pathname = usePathname();
  const firstName = getFirstName(developerName);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border-soft bg-white px-5 py-6 lg:block">
          <BoldverseBrand subtitle="Developer sales workspace" />

          <nav className="mt-8 space-y-2">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    aria-disabled="true"
                    className="flex min-h-12 items-center justify-between rounded-button px-4 text-sm font-extrabold text-text-muted/60"
                  >
                    <span className="flex items-center gap-3">
                      <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
                      {item.label}
                    </span>

                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-button px-4 text-sm font-extrabold transition",
                    active
                      ? "bg-primary text-white shadow-soft"
                      : "text-text-muted hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-border-soft bg-background/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="lg:hidden">
                <BoldverseBrand subtitle="Developer workspace" />
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
                    {companyName ?? "Developer account"}
                  </p>
                  <p className="text-xs font-semibold text-text-muted">
                    Estate sales workspace
                  </p>
                </div>

                <Badge tone="primary">Developer</Badge>

                <form action={developerSignOutAction}>
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
          aria-label="Mobile developer navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-white px-2 py-2 shadow-2xl lg:hidden"
        >
          <div className="flex items-center gap-1">
            {mobilePrimaryItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold transition",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-text-muted hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  <Icon aria-hidden="true" size={22} strokeWidth={2.6} />
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
