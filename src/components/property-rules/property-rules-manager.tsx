"use client";

import { useActionState, useMemo, useState } from "react";
import {
  archivePropertyRuleAction,
  createPropertyRuleAction,
} from "@/actions/property-rules.actions";
import { initialPropertyRuleActionState } from "@/actions/property-rules.state";
import type { PropertyRuleDetailRow } from "@/server/repositories/property-rules.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  Archive,
  Baby,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Dog,
  FileWarning,
  Home,
  Hotel,
  PackageCheck,
  ShieldCheck,
  UsersRound,
  Wind,
} from "lucide-react";

type PropertyRulesManagerProps = {
  propertyId: string;
  rules: PropertyRuleDetailRow[];
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
  }[];
};

type RulePreset = {
  code: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const rulePresets: RulePreset[] = [
  {
    code: "pets_not_allowed",
    title: "No pets",
    description: "Do not accept tenants with pets.",
    icon: <Dog aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "maximum_occupants",
    title: "Maximum number of people allowed",
    description: "Set the highest number of people allowed to live there.",
    icon: <UsersRound aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "residential_only",
    title: "Residential use only",
    description: "Do not accept tenants who want to run a business there.",
    icon: <Home aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "children_under_5_not_allowed",
    title: "No children under 5",
    description: "Do not accept tenants with children under 5.",
    icon: <Baby aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "minimum_monthly_income",
    title: "Can they keep paying the rent?",
    description: "Set the lowest monthly income or cashflow you accept.",
    icon: <CircleDollarSign aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "guarantor_required",
    title: "Guarantor needed",
    description: "Ask if the tenant can provide a guarantor if approved.",
    icon: <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "shortlet_not_allowed",
    title: "No short-let or Airbnb",
    description: "Do not accept tenants who want short-let or Airbnb use.",
    icon: <Hotel aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "subletting_not_allowed",
    title: "No subletting",
    description: "Do not accept tenants who want to rent it to someone else.",
    icon: <PackageCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "customer_facing_business_not_allowed",
    title: "No business with many visitors",
    description: "Do not accept business use that brings customers or staff.",
    icon: <BriefcaseBusiness aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "heavy_generator_or_equipment_not_allowed",
    title: "No heavy generator or equipment",
    description: "Do not accept heavy machines or large equipment.",
    icon: <Wind aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "large_gatherings_not_allowed",
    title: "No regular parties or large gatherings",
    description: "Do not accept regular parties, events, or large gatherings.",
    icon: <UsersRound aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
];

const enforcementCopy: Record<
  PropertyRuleDetailRow["enforcement"],
  {
    label: string;
    tone: "primary" | "success" | "warning" | "danger" | "neutral";
    description: string;
  }
> = {
  information_only: {
    label: "Info",
    tone: "primary",
    description: "This will not reject anyone automatically.",
  },
  landlord_review: {
    label: "You review",
    tone: "warning",
    description: "You will see this tenant before deciding.",
  },
  blocks_onboarding: {
    label: "Filters tenant",
    tone: "danger",
    description: "The tenant may be rejected if their answer does not match.",
  },
};

const statusCopy: Record<
  PropertyRuleDetailRow["status"],
  {
    label: string;
    tone: "primary" | "success" | "warning" | "danger" | "neutral";
  }
> = {
  active: {
    label: "Active",
    tone: "success",
  },
  inactive: {
    label: "Inactive",
    tone: "neutral",
  },
  archived: {
    label: "Removed",
    tone: "danger",
  },
};

function isPresetAlreadyAdded(rules: PropertyRuleDetailRow[], code: string) {
  return rules.some(
    (rule) => rule.status !== "archived" && rule.metadata?.rule_code === code,
  );
}

function getConfigNumber(rule: PropertyRuleDetailRow, key: string) {
  const value = rule.metadata?.config?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function getUnitOptions(units: PropertyRulesManagerProps["units"]) {
  return units.map((unit) => ({
    label: unit.building_name
      ? `${unit.unit_identifier} · ${unit.building_name}`
      : unit.unit_identifier,
    value: unit.id,
  }));
}

function RuleCheckboxCard({
  preset,
  checked,
  disabled,
  onChange,
}: {
  preset: RulePreset;
  checked: boolean;
  disabled: boolean;
  onChange: (code: string, checked: boolean) => void;
}) {
  return (
    <label
      className={[
        "flex min-h-24 cursor-pointer items-start gap-3 rounded-card border p-4 shadow-card transition",
        checked
          ? "border-primary bg-primary-soft"
          : "border-border-soft bg-white hover:border-primary",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      <input
        type="checkbox"
        name="ruleCodes"
        value={preset.code}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(preset.code, event.target.checked)}
        className="mt-1 size-4 rounded border-border-soft text-primary focus:ring-primary"
      />

      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary">
        {preset.icon}
      </span>

      <span>
        <span className="block text-sm font-extrabold text-text-strong">
          {preset.title}
        </span>
        <span className="mt-1 block text-sm leading-6 text-text-muted">
          {disabled ? "Already added." : preset.description}
        </span>
      </span>
    </label>
  );
}

function GuidedRuleCreateForm({
  propertyId,
  units,
  rules,
}: {
  propertyId: string;
  units: PropertyRulesManagerProps["units"];
  rules: PropertyRuleDetailRow[];
}) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [state, formAction, isPending] = useActionState(
    createPropertyRuleAction,
    initialPropertyRuleActionState,
  );

  const selectedPresets = rulePresets.filter((preset) =>
    selectedCodes.includes(preset.code),
  );

  const selectedNeedsMaximumOccupants =
    selectedCodes.includes("maximum_occupants");
  const selectedNeedsMinimumIncome = selectedCodes.includes(
    "minimum_monthly_income",
  );

  function updateSelectedCode(code: string, checked: boolean) {
    setSelectedCodes((currentCodes) => {
      if (checked) {
        return currentCodes.includes(code)
          ? currentCodes
          : [...currentCodes, code];
      }

      return currentCodes.filter((currentCode) => currentCode !== code);
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Saved"
        errorTitle="Could not save"
      />

      <input type="hidden" name="propertyId" value={propertyId} />

      <TrustNotice
        title="Choose the things you do not want"
        description="We will only ask tenants about the things you choose here. This keeps the tenant form short."
        icon={<ClipboardCheck aria-hidden="true" size={22} strokeWidth={2.6} />}
      />

      <Select
        label="Apply to"
        name="unitId"
        options={getUnitOptions(units)}
        placeholder="All units in this property"
        helperText="Leave this empty if it applies to the whole property."
      />

      <section>
        <h3 className="text-base font-extrabold text-text-strong">
          Things you do not want
        </h3>
        <p className="mt-1 text-sm leading-6 text-text-muted">
          Tick everything you want Tenuro to check before a tenant is approved.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rulePresets.map((preset) => (
            <RuleCheckboxCard
              key={preset.code}
              preset={preset}
              checked={selectedCodes.includes(preset.code)}
              disabled={isPresetAlreadyAdded(rules, preset.code)}
              onChange={updateSelectedCode}
            />
          ))}
        </div>
      </section>

      {selectedNeedsMaximumOccupants || selectedNeedsMinimumIncome ? (
        <div className="grid gap-4 md:grid-cols-2">
          {selectedNeedsMaximumOccupants ? (
            <Input
              label="Maximum number of people allowed"
              name="maximumOccupants"
              type="number"
              min={1}
              required
              placeholder="Example: 4"
              helperText="If a tenant enters more than this, Tenuro will reject the application."
            />
          ) : null}

          {selectedNeedsMinimumIncome ? (
            <Input
              label="Lowest monthly income or cashflow allowed"
              name="minimumMonthlyIncome"
              type="number"
              min={1}
              required
              placeholder="Example: 250000"
              helperText="If a tenant enters less than this, Tenuro will reject the application."
            />
          ) : null}
        </div>
      ) : null}

      {selectedPresets.length > 0 ? (
        <div className="rounded-button bg-primary-soft p-4">
          <p className="text-sm font-extrabold text-text-strong">
            Selected: {selectedPresets.map((preset) => preset.title).join(", ")}
          </p>
        </div>
      ) : null}

      <Input
        label="Display order"
        name="sortOrder"
        type="number"
        min={0}
        defaultValue={0}
        helperText="Leave as 0 if you are not sure."
        error={state.fieldErrors?.sortOrder?.[0]}
      />

      <Button type="submit" isLoading={isPending} fullWidth>
        Save Selected Checks
      </Button>
    </form>
  );
}

function PropertyRuleCard({
  propertyId,
  rule,
}: {
  propertyId: string;
  rule: PropertyRuleDetailRow;
}) {
  const [state, formAction, isPending] = useActionState(
    archivePropertyRuleAction,
    initialPropertyRuleActionState,
  );

  const status = statusCopy[rule.status];
  const enforcement = enforcementCopy[rule.enforcement];
  const maximumOccupants = getConfigNumber(rule, "maximumOccupants");
  const minimumMonthlyIncome = getConfigNumber(rule, "minimumMonthlyIncome");

  return (
    <article className="rounded-card border border-border-soft bg-white p-5 shadow-card">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Removed"
        errorTitle="Could not remove"
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone={enforcement.tone}>{enforcement.label}</Badge>
            <Badge tone="neutral">
              {rule.units?.unit_identifier ?? "Whole property"}
            </Badge>
          </div>

          <h3 className="mt-3 text-base font-extrabold text-text-strong">
            {rule.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-text-muted">
            {rule.description}
          </p>
        </div>

        {rule.status !== "archived" ? (
          <form action={formAction} className="shrink-0">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input type="hidden" name="propertyRuleId" value={rule.id} />

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              isLoading={isPending}
            >
              <Archive aria-hidden="true" size={16} strokeWidth={2.5} />
              Remove
            </Button>
          </form>
        ) : null}
      </div>

      {maximumOccupants || minimumMonthlyIncome ? (
        <div className="mt-4 rounded-button bg-primary-soft p-4">
          <p className="text-sm font-extrabold text-text-strong">
            {maximumOccupants
              ? `Maximum people allowed: ${maximumOccupants}`
              : `Lowest monthly income or cashflow allowed: ₦${Number(
                  minimumMonthlyIncome,
                ).toLocaleString("en-NG")}`}
          </p>
        </div>
      ) : null}

      <div className="mt-4 rounded-button bg-background p-4">
        <p className="text-sm font-semibold leading-6 text-text-muted">
          {enforcement.description}
        </p>
      </div>
    </article>
  );
}

function PropertyRulesList({
  propertyId,
  rules,
}: {
  propertyId: string;
  rules: PropertyRuleDetailRow[];
}) {
  if (rules.length === 0) {
    return (
      <EmptyState
        title="No check selected yet"
        description="Choose what you do not want, then save."
        icon={<FileWarning aria-hidden="true" size={24} strokeWidth={2.6} />}
      />
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <PropertyRuleCard key={rule.id} propertyId={propertyId} rule={rule} />
      ))}
    </div>
  );
}

export function PropertyRulesManager({
  propertyId,
  rules,
  units,
}: PropertyRulesManagerProps) {
  const visibleRules = useMemo(
    () => rules.filter((rule) => rule.status !== "archived"),
    [rules],
  );

  return (
    <ToastProvider>
      <div className="space-y-6">
        <GuidedRuleCreateForm
          propertyId={propertyId}
          units={units}
          rules={rules}
        />

        <div>
          <div className="mb-4 flex items-center gap-2">
            <h3 className="text-base font-extrabold text-text-strong">
              Current checks
            </h3>
            <Badge tone="warning">{visibleRules.length}</Badge>
          </div>

          <PropertyRulesList propertyId={propertyId} rules={visibleRules} />
        </div>
      </div>
    </ToastProvider>
  );
}
