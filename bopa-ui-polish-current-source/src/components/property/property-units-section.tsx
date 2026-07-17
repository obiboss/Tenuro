"use client";

import { useState } from "react";
import { Home, Plus } from "lucide-react";
import { UnitForm } from "@/components/property/unit-form";
import { UnitCard } from "@/components/property/unit-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { SlideOverPanel } from "@/components/ui/slide-over-panel";
import type { UnitRow } from "@/server/repositories/units.repository";

type PropertyUnitsSectionProps = {
  propertyId: string;
  units: UnitRow[];
  initialUnitCount: number;
  onUnitSaved?: (params: { wasFirstUnit: boolean }) => void;
};

export function PropertyUnitsSection({
  propertyId,
  units,
  initialUnitCount,
  onUnitSaved,
}: PropertyUnitsSectionProps) {
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  function handleUnitSaved() {
    const wasFirstUnit = initialUnitCount === 0;

    setIsAddUnitOpen(false);
    onUnitSaved?.({ wasFirstUnit });
  }

  return (
    <>
      <SectionCard
        title="Units"
        description="Each room, flat, shop, or rentable space in this property."
        action={
          units.length > 0 ? (
            <Button type="button" onClick={() => setIsAddUnitOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <Plus aria-hidden="true" size={18} strokeWidth={2.6} />
                Add Unit
              </span>
            </Button>
          ) : undefined
        }
      >
        {units.length === 0 ? (
          <EmptyState
            title="Add your first unit"
            description="Create the rooms, flats, shops, or offices in this property so you can assign tenants and start tracking rent."
            icon={<Home aria-hidden="true" size={24} strokeWidth={2.6} />}
            action={
              <Button type="button" onClick={() => setIsAddUnitOpen(true)}>
                Add your first unit
              </Button>
            }
            className="border border-dashed border-border-soft bg-background shadow-none"
          />
        ) : (
          <div className="grid gap-4">
            {units.map((unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        )}
      </SectionCard>

      <SlideOverPanel
        open={isAddUnitOpen}
        onClose={() => setIsAddUnitOpen(false)}
        title="Add Unit"
        description="Create a rentable space under this property."
      >
        <UnitForm
          propertyId={propertyId}
          layout="embedded"
          onSuccess={handleUnitSaved}
        />
      </SlideOverPanel>
    </>
  );
}
