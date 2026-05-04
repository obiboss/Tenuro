"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  Home,
  LockKeyhole,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { MobileMoreMenu } from "@/components/layout/mobile-more-menu";
import { Badge } from "@/components/ui/badge";
import { ToastProvider } from "@/components/ui/toast-provider";
import { cn } from "@/lib/cn";

type LandlordShellProps = {
  children: React.ReactNode;
  landlordName: string;
};

const desktopNavItems = [
  {
    label: "Overview",
    href: "/overview",
    icon: Home,
    status: "available",
  },
  {
    label: "Properties",
    href: "/properties",
    icon: Building2,
    status: "available",
  },
  {
    label: "Tenants",
    href: "/tenants",
    icon: Users,
    status: "available",
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    status: "available",
  },
  {
    label: "Renewals",
    href: "/renewals",
    icon: RefreshCcw,
    status: "coming_soon",
  },
  {
    label: "Caretakers",
    href: "/caretakers",
    icon: ShieldCheck,
    status: "coming_soon",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    status: "coming_soon",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    status: "available",
  },
];

const mobilePrimaryItems = [
  {
    label: "Overview",
    href: "/overview",
    icon: Home,
  },
  {
    label: "Properties",
    href: "/properties",
    icon: Building2,
  },
  {
    label: "Tenants",
    href: "/tenants",
    icon: Users,
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
];

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Landlord";
}

function TenuroBrand({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/overview" className="flex min-w-0 items-center gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
        <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
      </div>

      <div className="min-w-0">
        <p className="truncate text-lg font-extrabold tracking-tight text-text-strong">
          Tenuro
        </p>
        <p className="truncate text-xs font-semibold text-text-muted">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

export function LandlordShell({ children, landlordName }: LandlordShellProps) {
  const pathname = usePathname();
  const firstName = getFirstName(landlordName);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border-soft bg-white px-5 py-6 lg:block">
          <TenuroBrand subtitle="Property records made simple" />

          <nav className="mt-8 space-y-2">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const comingSoon = item.status === "coming_soon";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-button px-4 text-sm font-extrabold transition",
                    active
                      ? "bg-primary text-white shadow-soft"
                      : "text-text-muted hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
                    {item.label}
                  </span>

                  {comingSoon ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
                        active ? "text-white/75" : "text-text-muted/70",
                      )}
                    >
                      <LockKeyhole
                        aria-hidden="true"
                        size={11}
                        strokeWidth={2.6}
                      />
                      Soon
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-border-soft bg-white/95 px-4 py-4 backdrop-blur md:px-6 lg:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <TenuroBrand subtitle="Landlord dashboard" />
              <LogoutButton className="shrink-0" />
            </div>
          </header>

          <header className="sticky top-0 z-30 hidden border-b border-border-soft bg-background/90 px-6 py-4 backdrop-blur lg:block">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text-muted">
                  Welcome back,
                </p>
                <h1 className="text-lg font-black tracking-tight text-text-strong">
                  {firstName}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <Badge tone="primary">Landlord</Badge>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 pb-28 md:px-6 lg:pb-8">
            <div className="mb-5 flex items-center justify-between gap-4 lg:hidden">
              <div>
                <p className="text-sm font-semibold text-text-muted">
                  Welcome back,
                </p>
                <h1 className="text-xl font-black tracking-tight text-text-strong">
                  {firstName}
                </h1>
              </div>

              <Badge tone="primary">Landlord</Badge>
            </div>

            {children}
          </main>
        </div>

        <nav
          aria-label="Mobile landlord navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-white px-2 py-2 shadow-2xl lg:hidden"
        >
          <div className="flex items-center gap-1">
            {mobilePrimaryItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
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

            <MobileMoreMenu />
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
