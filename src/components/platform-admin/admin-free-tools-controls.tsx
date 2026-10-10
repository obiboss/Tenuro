"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import type {
  PlatformAdminFreeToolsPeriod,
  PlatformAdminFreeToolsProduct,
} from "@/server/services/platform-admin-free-tools.service";

const periods: PlatformAdminFreeToolsPeriod[] = [7, 30, 60, 90];
const products: Array<{
  value: PlatformAdminFreeToolsProduct;
  label: string;
}> = [
  { value: "receipt", label: "Receipts" },
  { value: "tenancy_agreement", label: "Agreements" },
  { value: "both", label: "Both" },
];

type AdminFreeToolsControlsProps = {
  periodDays: PlatformAdminFreeToolsPeriod;
  product: PlatformAdminFreeToolsProduct;
};

export function AdminFreeToolsControls({
  periodDays,
  product,
}: AdminFreeToolsControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: "period" | "product", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const buttonClass = (active: boolean) =>
    cn(
      "min-h-10 rounded-lg px-3 py-2 text-sm font-bold transition-colors",
      active
        ? "bg-primary text-white"
        : "text-text-muted hover:bg-primary-soft hover:text-primary",
    );

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:items-end",
        isPending && "opacity-70",
      )}
      aria-busy={isPending}
    >
      <div className="grid grid-cols-4 gap-1 rounded-button bg-white p-1 shadow-soft">
        {periods.map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={periodDays === period}
            disabled={isPending}
            onClick={() => update("period", String(period))}
            className={buttonClass(periodDays === period)}
          >
            {period} days
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-button bg-white p-1 shadow-soft">
        {products.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={product === option.value}
            disabled={isPending}
            onClick={() => update("product", option.value)}
            className={buttonClass(product === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
