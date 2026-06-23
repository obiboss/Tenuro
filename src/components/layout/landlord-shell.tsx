"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
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
    label: "Notifications",
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
] as const;

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Landlord";
}

function BoldverseBrand({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/overview" className="flex min-w-0 items-center gap-3">
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
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border-soft bg-white px-5 py-6 lg:block">
          <BoldverseBrand subtitle="Property Management for Modern Landlords" />

          <nav className="mt-8 space-y-2">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const comingSoon = item.status === "coming_soon";
              const subscriptionLocked =
                platformAccessLocked && isSubscriptionGatedNavHref(item.href);
              const href = resolveNavHref(item.href, platformAccessLocked);

              return (
                <Link
                  key={item.href}
                  href={href}
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
                  ) : subscriptionLocked ? (
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
          </nav>
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-border-soft bg-white/95 px-4 py-4 backdrop-blur md:px-6 lg:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <BoldverseBrand subtitle="Landlord dashboard" />
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

          <main className="mx-auto max-w-7xl px-4 py-3 pb-28 md:px-6 md:py-6 lg:pb-8">
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

              const href = resolveNavHref(item.href, platformAccessLocked);

              return (
                <Link
                  key={item.href}
                  href={href}
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

            <MobileMoreMenu platformAccessLocked={platformAccessLocked} />
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
