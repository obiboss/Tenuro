"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { PropertyRulesManager } from "@/components/property-rules/property-rules-manager";
import { PropertyUnitsSection } from "@/components/property/property-units-section";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/cn";
import type { PropertyRuleDetailRow } from "@/server/repositories/property-rules.repository";
import type { UnitRow } from "@/server/repositories/units.repository";

type PropertySetupSectionProps = {
  propertyId: string;
  propertyName: string;
  units: UnitRow[];
  rules: PropertyRuleDetailRow[];
};

export function PropertySetupSection({
  propertyId,
  propertyName,
  units,
  rules,
}: PropertySetupSectionProps) {
  const router = useRouter();
  const unitsTopRef = useRef<HTMLDivElement | null>(null);
  const rulesRef = useRef<HTMLDivElement | null>(null);
  const [revealRules, setRevealRules] = useState(false);
  const [rulesVisible, setRulesVisible] = useState(units.length > 0);
  const showRules = units.length > 0 || revealRules;

  function handleUnitSaved(params: { wasFirstUnit: boolean }) {
    router.refresh();

    window.requestAnimationFrame(() => {
      unitsTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      if (params.wasFirstUnit) {
        setRevealRules(true);
        setRulesVisible(true);

        window.setTimeout(() => {
          rulesRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 300);
      }
    });
  }

  return (
    <>
      <div ref={unitsTopRef} id="property-units-top" className="scroll-mt-28">
        <PropertyUnitsSection
          propertyId={propertyId}
          units={units}
          initialUnitCount={units.length}
          onUnitSaved={handleUnitSaved}
        />
      </div>

      {showRules ? (
        <div
          ref={rulesRef}
          id="property-rules"
          className={cn(
            "mt-6 scroll-mt-28 transition-all duration-500 ease-out",
            rulesVisible || units.length > 0
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0",
          )}
        >
          <SectionCard
            title="Property Rules"
            description="Set tenant requirements for this property."
          >
            <PropertyRulesManager
              propertyId={propertyId}
              rules={rules}
              units={units}
            />
          </SectionCard>
        </div>
      ) : null}

      <div id="property-agreement-template" className="mt-6 scroll-mt-28">
        <SectionCard
          title="Agreement for this property"
          description={`The general agreement will be used for ${propertyName} unless you choose different wording here.`}
        >
          <Link
            href={`/agreements?property=${propertyId}`}
            className="flex min-h-14 items-center justify-between gap-4 rounded-button border border-border-soft bg-white px-4 py-3 font-extrabold text-primary transition hover:bg-primary-soft"
          >
            <span className="flex items-center gap-3">
              <FileText aria-hidden="true" size={22} strokeWidth={2.5} />
              View or edit this agreement
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        </SectionCard>
      </div>
    </>
  );
}
