"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { OverviewPropertyOption } from "@/server/services/rent-control-overview.service";

type OverviewPropertyFilterProps = {
  properties: OverviewPropertyOption[];
  selectedPropertyId: string | null;
  filterLabel: string;
};

const pillClassName =
  "inline-flex min-h-11 max-w-[11rem] items-center gap-1 rounded-full border border-border-soft bg-white px-4 text-sm font-bold text-text-strong sm:max-w-none";

export function OverviewPropertyFilter({
  properties,
  selectedPropertyId,
  filterLabel,
}: OverviewPropertyFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (properties.length <= 1) {
    return (
      <span className={cn(pillClassName, "truncate")}>
        <span className="truncate">{filterLabel}</span>
      </span>
    );
  }

  function handlePropertyChange(propertyId: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!propertyId) {
      params.delete("property");
    } else {
      params.set("property", propertyId);
    }

    const query = params.toString();

    router.replace(query ? `/overview?${query}` : "/overview");
  }

  return (
    <label className={cn(pillClassName, "relative cursor-pointer truncate")}>
      <span className="sr-only">Filter by property</span>
      <select
        value={selectedPropertyId ?? ""}
        onChange={(event) => handlePropertyChange(event.target.value)}
        className="max-w-full cursor-pointer appearance-none truncate bg-transparent pr-4 font-bold text-text-strong focus:outline-none"
        aria-label="Filter by property"
      >
        <option value="">All properties</option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={17}
        strokeWidth={2.6}
        className="pointer-events-none absolute right-2 shrink-0 text-text-muted"
      />
    </label>
  );
}
