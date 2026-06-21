"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";
import type { OverviewPropertyOption } from "@/server/services/rent-control-overview.service";

type OverviewPropertyFilterProps = {
  properties: OverviewPropertyOption[];
  selectedPropertyId: string | null;
  filterLabel: string;
};

export function OverviewPropertyFilter({
  properties,
  selectedPropertyId,
  filterLabel,
}: OverviewPropertyFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (properties.length <= 1) {
    return (
      <div className="inline-flex min-h-11 items-center gap-2 rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-bold text-text-strong">
        <Building2 aria-hidden="true" size={16} strokeWidth={2.6} />
        <span>{filterLabel}</span>
      </div>
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
    <label className="relative inline-flex min-h-11 items-center gap-2 rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-bold text-text-strong">
      <Building2 aria-hidden="true" size={16} strokeWidth={2.6} />
      <span className="sr-only">Filter by property</span>
      <select
        value={selectedPropertyId ?? ""}
        onChange={(event) => handlePropertyChange(event.target.value)}
        className="min-w-0 appearance-none bg-transparent pr-6 font-bold text-text-strong focus:outline-none"
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
        size={16}
        strokeWidth={2.6}
        className="pointer-events-none absolute right-3 text-text-muted"
      />
    </label>
  );
}
