"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { ToastProvider } from "@/components/ui/toast-provider";
import { cn } from "@/lib/cn";
import { isPlatformAdminNavItemActive } from "@/lib/platform-admin-navigation";
import { PLATFORM_ADMIN_NAVIGATION } from "@/lib/navigation";
import {
  isAggressiveWorkflowPrefetchAllowed,
} from "@/lib/workflow-prefetch-policy";

type PlatformAdminShellProps = {
  children: React.ReactNode;
  adminName: string;
};

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Admin";
}

function AdminBrand() {
  return (
    <Link href="/admin" className="flex min-w-0 items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
        <ShieldCheck aria-hidden="true" size={23} strokeWidth={2.7} />
      </div>

      <div className="min-w-0">
        <p className="truncate text-lg font-extrabold tracking-tight text-text-strong">
          BOPA Admin
        </p>
        <p className="truncate text-xs font-semibold text-text-muted">
          Platform operations
        </p>
      </div>
    </Link>
  );
}

export function PlatformAdminShell({
  children,
  adminName,
}: PlatformAdminShellProps) {
  const pathname = usePathname();
  const firstName = getFirstName(adminName);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border-soft bg-white px-5 py-6 lg:block">
          <AdminBrand />

          <nav
            className="mt-8 space-y-2"
            aria-label="Platform admin navigation"
          >
            {PLATFORM_ADMIN_NAVIGATION.map((item) => {
              const Icon = item.icon;
              const active = isPlatformAdminNavItemActive(pathname, item.href);
              const comingSoon = item.status === "coming_soon";
              const className = cn(
                "flex min-h-12 items-center justify-between rounded-button px-4 text-sm font-extrabold transition",
                active && !comingSoon
                  ? "bg-primary text-white shadow-soft"
                  : "text-text-muted hover:bg-primary-soft hover:text-primary",
                comingSoon &&
                  "cursor-not-allowed opacity-75 hover:bg-transparent",
              );

              const content = (
                <>
                  <span className="flex items-center gap-3">
                    <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
                    {item.label}
                  </span>

                  {comingSoon ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-text-muted/70">
                      <LockKeyhole
                        aria-hidden="true"
                        size={11}
                        strokeWidth={2.6}
                      />
                      Soon
                    </span>
                  ) : null}
                </>
              );

              if (comingSoon) {
                return (
                  <div
                    key={item.href}
                    className={className}
                    aria-disabled="true"
                  >
                    {content}
                  </div>
                );
              }

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
                  className={className}
                >
                  {content}
                </Link>
              );
            })}
          </nav>

          <div className="absolute inset-x-5 bottom-6">
            <LogoutButton className="w-full justify-center" />
          </div>
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-border-soft bg-white/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-muted">
                  Platform admin
                </p>
                <h1 className="truncate text-lg font-black tracking-tight text-text-strong">
                  {firstName}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <Badge tone="primary">Admin</Badge>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 pb-10 md:px-6">
            <div className="mb-5 lg:hidden">
              <AdminBrand />

              <nav
                className="mt-4 grid gap-2 sm:grid-cols-2"
                aria-label="Mobile platform admin navigation"
              >
                {PLATFORM_ADMIN_NAVIGATION.map((item) => {
                  const Icon = item.icon;
                  const active = isPlatformAdminNavItemActive(pathname, item.href);
                  const comingSoon = item.status === "coming_soon";
                  const className = cn(
                    "flex min-h-12 items-center justify-between rounded-button px-4 text-sm font-extrabold transition",
                    active && !comingSoon
                      ? "bg-primary text-white shadow-soft"
                      : "bg-white text-text-muted hover:bg-primary-soft hover:text-primary",
                    comingSoon &&
                      "cursor-not-allowed opacity-75 hover:bg-white hover:text-text-muted",
                  );

                  const content = (
                    <>
                      <span className="flex items-center gap-3">
                        <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
                        {item.label}
                      </span>

                      {comingSoon ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          Soon
                        </span>
                      ) : null}
                    </>
                  );

                  if (comingSoon) {
                    return (
                      <div
                        key={item.href}
                        className={className}
                        aria-disabled="true"
                      >
                        {content}
                      </div>
                    );
                  }

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
                      className={className}
                    >
                      {content}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
