import { MANAGER_UNIT_STATUS_LABELS } from "@/constants/manager";
import type {
  ManagerPropertyRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerUnitListProps = {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function ManagerUnitList({ properties, units }: ManagerUnitListProps) {
  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.property_name]),
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Units
        </h2>
        <p className="text-sm font-semibold leading-6 text-text-muted">
          Units are the rentable spaces under each property.
        </p>
      </div>

      {units.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft">
          {units.map((unit) => (
            <article
              key={unit.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-black text-text-strong">
                  {unit.unit_label}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {propertyNameById.get(unit.property_id) ?? "Property"}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {unit.unit_type ?? "Unit"} · {formatNaira(unit.rent_amount)}
                </p>
              </div>

              <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                {MANAGER_UNIT_STATUS_LABELS[unit.status]}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No unit has been added yet.
          </p>
        </div>
      )}
    </section>
  );
}

