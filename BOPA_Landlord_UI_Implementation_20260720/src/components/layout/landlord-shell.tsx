"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  FileText,
  History,
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
import { GATED_LANDLORD_PATH_PREFIXES } from "@/server/constants/landlord-subscription-gating";
import { cn } from "@/lib/cn";

type LandlordShellProps = {
  children: React.ReactNode;
  landlordName: string;
  platformAccessLocked?: boolean;
};

function isSubscriptionGatedNavHref(href: string) {
  return GATED_LANDLORD_PATH_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`),
  );
}

function resolveNavHref(href: string, platformAccessLocked: boolean) {
  if (platformAccessLocked && isSubscriptionGatedNavHref(href)) {
    return "/settings?subscription=required#bopa-plans";
  }

  return href;
}

const desktopNavItems = [
  {
    label: "Home",
    href: "/overview",
    icon: Home,
  },
  {
    label: "My property",
    href: "/properties",
    icon: Building2,
  },
  {
    label: "My tenants",
    href: "/tenants",
    icon: Users,
  },
  {
    label: "Rent payments",
    href: "/payments",
    icon: CreditCard,
  },
  {
    label: "Agreements",
    href: "/agreements",
    icon: FileText,
  },
] as const;

const desktopMoreItems = [
  {
    label: "Rent alerts",
    href: "/notifications",
    icon: Bell,
    status: "available",
  },
  {
    label: "Renewals",
    href: "/renewals",
    icon: RefreshCcw,
    status: "available",
  },
  {
    label: "Activity",
    href: "/activity",
    icon: History,
    status: "available",
  },
  {
    label: "Caretakers",
    href: "/caretakers",
    icon: ShieldCheck,
    status: "available",
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
] as const;

const mobilePrimaryItems = [
  {
    label: "Home",
    href: "/overview",
    icon: Home,
  },
  {
    label: "Property",
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
] as const;

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Landlord";
}

function BoldverseBrand({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/overview" className="flex min-w-0 items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-2xl font-extrabold tracking-tight text-white">
        B
      </div>

      <div className="min-w-0">
        <p className="truncate text-xl font-black tracking-tight text-text-strong">
          BOPA
        </p>
        <p className="truncate text-xs font-bold text-text-muted">{subtitle}</p>
      </div>
    </Link>
  );
}

export function LandlordShell({
  children,
  landlordName,
  platformAccessLocked = false,
}: LandlordShellProps) {
  const pathname = usePathname();
  const firstName = getFirstName(landlordName);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border-soft bg-white px-4 py-5 lg:flex lg:flex-col">
          <BoldverseBrand subtitle="My property" />

          <nav className="mt-7 space-y-2" aria-label="Landlord navigation">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const subscriptionLocked =
                platformAccessLocked && isSubscriptionGatedNavHref(item.href);
              const href = resolveNavHref(item.href, platformAccessLocked);

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-xl border-l-4 px-3 text-base font-bold transition",
                    active
                      ? "border-primary bg-primary-soft text-[#203c67]"
                      : "border-transparent text-[#4f5b6d] hover:bg-background hover:text-text-strong",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
                    {item.label}
                  </span>

                  {subscriptionLocked ? (
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
                      Plan
                    </span>
                  ) : null}
                </Link>
              );
            })}

            <details
              className="group border-t border-border-soft pt-4"
              open={desktopMoreItems.some(
                (item) =>
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`),
              )}
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-4 text-base font-bold text-[#4f5b6d] transition hover:bg-background hover:text-text-strong">
                <span aria-hidden="true" className="text-lg tracking-widest">
                  •••
                </span>
                More
              </summary>

              <div className="mt-1 space-y-1 pl-2">
                {desktopMoreItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const href = resolveNavHref(item.href, platformAccessLocked);

                  return (
                    <Link
                      key={item.href}
                      href={href}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold transition",
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-text-muted hover:bg-background hover:text-text-strong",
                      )}
                    >
                      <Icon aria-hidden="true" size={17} strokeWidth={2.5} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </details>
          </nav>

          <div className="mt-auto rounded-xl bg-background p-3">
            <p className="font-extrabold text-text-strong">Need help?</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
              Open Settings to manage your account or get assistance.
            </p>
          </div>
        </aside>

        <div className="lg:pl-60">
          <header className="sticky top-0 z-30 border-b border-border-soft bg-white px-4 py-3 md:px-6 lg:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <BoldverseBrand subtitle="My property" />

              <Link
                href="/notifications"
                aria-label="Rent alerts"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-soft bg-white text-primary"
              >
                <Bell aria-hidden="true" size={21} strokeWidth={2.6} />
              </Link>
            </div>
          </header>

          <header className="sticky top-0 z-30 hidden border-b border-border-soft bg-white px-8 py-4 lg:block">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black tracking-tight text-text-strong">
                  Welcome, {firstName}
                </h1>
                <p className="mt-0.5 text-sm font-semibold text-text-muted">
                  Let&apos;s take care of your property.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge tone="primary">Landlord</Badge>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-5 pb-28 md:px-8 md:py-7 lg:pb-10">
            {children}
          </main>
        </div>

        <nav
          aria-label="Mobile landlord navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-white px-2 py-2 shadow-[0_-8px_24px_rgba(17,24,39,0.06)] lg:hidden"
        >
          <div className="flex items-center gap-1">
            {mobilePrimaryItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              const href = resolveNavHref(item.href, platformAccessLocked);

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-bold transition",
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

            <MobileMoreMenu platformAccessLocked={platformAccessLocked} />
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
