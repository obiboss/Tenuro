"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Building2, CreditCard, Home, Send } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { ToastProvider } from "@/components/ui/toast-provider";
import { cn } from "@/lib/cn";
import { isAggressiveWorkflowPrefetchAllowed } from "@/lib/workflow-prefetch-policy";

type AgentShellProps = {
  children: React.ReactNode;
  agentName: string;
};

const agentNavItems = [
  {
    label: "Overview",
    href: "/agent/overview",
    icon: Home,
  },
  {
    label: "Listings",
    href: "/agent/listings",
    icon: Building2,
  },
  {
    label: "Onboarding",
    href: "/agent/onboarding",
    icon: Send,
  },
  {
    label: "Commissions",
    href: "/agent/commissions",
    icon: CreditCard,
  },
] as const;

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Agent";
}

export function AgentShell({ children, agentName }: AgentShellProps) {
  const pathname = usePathname();
  const firstName = getFirstName(agentName);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border-soft bg-white px-5 py-6 lg:block">
          <Link
            href="/agent/overview"
            prefetch={
              isAggressiveWorkflowPrefetchAllowed("/agent/overview")
                ? true
                : false
            }
            className="flex items-center gap-3"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
              <BadgeCheck aria-hidden="true" size={23} strokeWidth={2.7} />
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight text-text-strong">
                BOPA Agent
              </p>
              <p className="text-xs font-semibold text-text-muted">
                Verified property partner
              </p>
            </div>
          </Link>

          <nav className="mt-8 space-y-2" aria-label="Agent navigation">
            {agentNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={
                    isAggressiveWorkflowPrefetchAllowed(item.href)
                      ? true
                      : false
                  }
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

          <div className="absolute inset-x-5 bottom-6">
            <LogoutButton className="w-full justify-center" />
          </div>
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-border-soft bg-white/95 px-4 py-4 backdrop-blur md:px-6">
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
                <Badge tone="primary">Agent</Badge>
                <div>
                  <LogoutButton />
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
