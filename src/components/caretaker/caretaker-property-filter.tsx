"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CaretakerPropertyOption } from "@/server/services/caretaker-overview.service";

type CaretakerPropertyFilterProps = {
  properties: CaretakerPropertyOption[];
  selectedPropertyId: string | null;
  filterLabel: string;
};

const pillClassName =
  "inline-flex h-8 max-w-[9.5rem] items-center gap-1 rounded-full border border-border-soft bg-white px-3 text-xs font-bold text-text-strong sm:max-w-none";

export function CaretakerPropertyFilter({
  properties,
  selectedPropertyId,
  filterLabel,
}: CaretakerPropertyFilterProps) {
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

    router.replace(
      query ? `/caretaker/overview?${query}` : "/caretaker/overview",
    );
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
        <option value="">All assigned properties</option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={14}
        strokeWidth={2.6}
        className="pointer-events-none absolute right-2 shrink-0 text-text-muted"
      />
    </label>
  );
}
