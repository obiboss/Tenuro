"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { LANDLORD_NAVIGATION } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 border-r border-border-soft bg-surface px-4 py-5 lg:fixed lg:inset-y-0 lg:left-0 lg:block">
      <Link href="/overview" className="flex items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
          <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
        </div>

        <div>
          <p className="text-lg font-extrabold tracking-tight text-text-strong">
            Tenuro
          </p>
          <p className="text-xs font-semibold text-text-muted">
            Property records made simple
          </p>
        </div>
      </Link>

      <nav className="mt-8 space-y-1" aria-label="Main navigation">
        {LANDLORD_NAVIGATION.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-button px-3 text-sm font-bold transition",
                isActive
                  ? "bg-primary text-white shadow-soft"
                  : "text-text-normal hover:bg-primary-soft hover:text-primary",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl",
                  isActive ? "bg-white/15" : "bg-background",
                )}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
