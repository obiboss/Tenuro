"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Home,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";

const tenantMobileItems = [
  {
    label: "Home",
    href: "/tenant",
    icon: Home,
  },
  {
    label: "Rent",
    href: "/tenant#rent",
    icon: CalendarDays,
  },
  {
    label: "Payments",
    href: "/tenant#payments",
    icon: ReceiptText,
  },
  {
    label: "Agreement",
    href: "/tenant#agreement",
    icon: FileText,
  },
  {
    label: "Profile",
    href: "/tenant#profile",
    icon: UserRound,
  },
];

export function TenantMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile tenant navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-white px-2 py-2 shadow-2xl md:hidden"
    >
      <div className="flex items-center gap-1">
        {tenantMobileItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === "/tenant" && item.href === "/tenant";

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
      </div>
    </nav>
  );
}
