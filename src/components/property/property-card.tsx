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
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Building2 aria-hidden="true" size={24} strokeWidth={2.6} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-text-strong">
                {property.property_name}
              </h2>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                {property.address}, {property.lga}, {property.state}
              </p>
            </div>

            <Badge tone="primary">
              {propertyTypeLabel(property.property_type)}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-button bg-background p-3">
              <div className="flex items-center gap-2 text-text-muted">
                <Home aria-hidden="true" size={18} strokeWidth={2.5} />
                <p className="text-xs font-bold">Total Units</p>
              </div>
              <p className="mt-1 text-lg font-extrabold text-text-strong">
                {totalUnits}
              </p>
            </div>

            <div className="rounded-button bg-success-soft p-3">
              <div className="flex items-center gap-2 text-success">
                <Users aria-hidden="true" size={18} strokeWidth={2.5} />
                <p className="text-xs font-bold">Occupied</p>
              </div>
              <p className="mt-1 text-lg font-extrabold text-text-strong">
                {occupiedUnits}
              </p>
            </div>

            <div className="rounded-button bg-warning-soft p-3">
              <div className="flex items-center gap-2 text-warning">
                <Home aria-hidden="true" size={18} strokeWidth={2.5} />
                <p className="text-xs font-bold">Vacant</p>
              </div>
              <p className="mt-1 text-lg font-extrabold text-text-strong">
                {vacantUnits}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/properties/${property.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-semibold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
