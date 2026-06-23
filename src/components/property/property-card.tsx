import Link from "next/link";
import { Building2, Home, Users } from "lucide-react";
import { ArchivePropertyButton } from "@/components/property/archive-property-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PropertyWithUnitStats } from "@/server/repositories/properties.repository";

type PropertyCardProps = {
  property: PropertyWithUnitStats;
};

function propertyTypeLabel(type: PropertyWithUnitStats["property_type"]) {
  if (type === "residential" || type === "residential_compound") {
    return "Residential";
  }

  if (type === "flat_complex") {
    return "Flat complex";
  }

  return "Mixed-use";
}

export function PropertyCard({ property }: PropertyCardProps) {
  const totalUnits = property.units.length;
  const occupiedUnits = property.units.filter(
    (unit) => unit.status === "occupied",
  ).length;
  const vacantUnits = property.units.filter(
    (unit) => unit.status === "vacant",
  ).length;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Building2 aria-hidden="true" size={20} strokeWidth={2.6} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold text-text-strong">
                {property.property_name}
              </h2>

              <p className="mt-0.5 truncate text-sm font-semibold text-text-muted">
                {property.address}, {property.lga}
              </p>
            </div>

            <Badge tone="primary">{propertyTypeLabel(property.property_type)}</Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-bold text-text-strong">
              <Home aria-hidden="true" size={12} strokeWidth={2.5} />
              {totalUnits} units
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
              <Users aria-hidden="true" size={12} strokeWidth={2.5} />
              {occupiedUnits} occupied
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
              <Home aria-hidden="true" size={12} strokeWidth={2.5} />
              {vacantUnits} vacant
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/properties/${property.id}`}
              className="inline-flex min-h-9 items-center justify-center rounded-button bg-surface px-4 py-2 text-xs font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View Property
            </Link>

            <ArchivePropertyButton propertyId={property.id} />
          </div>
        </div>
      </div>
    </Card>
  );
}
