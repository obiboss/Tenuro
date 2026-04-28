"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { LANDLORD_NAVIGATION } from "@/lib/navigation";

const MOBILE_ITEMS = LANDLORD_NAVIGATION.slice(0, 5);

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-surface px-2 py-2 shadow-card lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 gap-1">
        {MOBILE_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-button px-1 text-[11px] font-bold transition",
                isActive
                  ? "bg-primary-soft text-primary"
                  : "text-text-muted hover:bg-primary-soft hover:text-primary",
              )}
            >
              <Icon aria-hidden="true" size={21} strokeWidth={2.6} />
              <span className="mt-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
