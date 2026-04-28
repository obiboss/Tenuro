import { BedDouble, Bath, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { UnitRow } from "@/server/repositories/units.repository";

type UnitCardProps = {
  unit: UnitRow;
};

function unitTypeLabel(type: UnitRow["unit_type"]) {
  const labels: Record<UnitRow["unit_type"], string> = {
    single_room: "Single Room",
    self_contain: "Self Contain",
    room_and_parlour: "Room and Parlour",
    mini_flat: "Mini Flat",
    two_bedroom_flat: "2 Bedroom Flat",
    three_bedroom_flat: "3 Bedroom Flat",
    duplex: "Duplex",
    shop: "Shop",
    office_space: "Office Space",
    other: "Other",
  };

  return labels[type];
}

function statusBadge(status: UnitRow["status"]) {
  if (status === "occupied") {
    return <Badge tone="success">Occupied</Badge>;
  }

  if (status === "vacant") {
    return <Badge tone="warning">Vacant</Badge>;
  }

  if (status === "under_renovation") {
    return <Badge tone="primary">Under Renovation</Badge>;
  }

  if (status === "hold") {
    return <Badge tone="warning">On Hold</Badge>;
  }

  if (status === "pending_vacancy") {
    return <Badge tone="warning">Moving Out Soon</Badge>;
  }

  return <Badge tone="neutral">Archived</Badge>;
}

function formatMoney(amount: number | null, currencyCode: string) {
  if (amount === null) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function UnitCard({ unit }: UnitCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Home aria-hidden="true" size={22} strokeWidth={2.6} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-text-strong">
                {unit.unit_identifier}
              </h3>

              <p className="mt-1 text-sm font-semibold text-text-muted">
                {unitTypeLabel(unit.unit_type)}
              </p>
            </div>

            {statusBadge(unit.status)}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-button bg-background p-3">
              <p className="text-xs font-bold text-text-muted">Annual Rent</p>
              <p className="mt-1 text-sm font-extrabold text-text-strong">
                {formatMoney(unit.annual_rent, unit.currency_code)}
              </p>
            </div>

            <div className="rounded-button bg-background p-3">
              <p className="text-xs font-bold text-text-muted">Monthly Rent</p>
              <p className="mt-1 text-sm font-extrabold text-text-strong">
                {formatMoney(unit.monthly_rent, unit.currency_code)}
              </p>
            </div>

            <div className="rounded-button bg-background p-3">
              <div className="flex items-center gap-2 text-text-muted">
                <BedDouble aria-hidden="true" size={17} strokeWidth={2.5} />
                <p className="text-xs font-bold">Bedrooms</p>
              </div>
              <p className="mt-1 text-sm font-extrabold text-text-strong">
                {unit.bedrooms}
              </p>
            </div>

            <div className="rounded-button bg-background p-3">
              <div className="flex items-center gap-2 text-text-muted">
                <Bath aria-hidden="true" size={17} strokeWidth={2.5} />
                <p className="text-xs font-bold">Bathrooms</p>
              </div>
              <p className="mt-1 text-sm font-extrabold text-text-strong">
                {unit.bathrooms}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
