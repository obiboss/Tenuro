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
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  Archive,
  Baby,
  BriefcaseBusiness,
  Car,
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
  group: "tenant_requirement" | "house_rule";
  icon: React.ReactNode;
  needsNumber?: {
    fieldName: string;
    label: string;
    helperText: string;
  };
  needsOtherText?: boolean;
};

const rulePresets: RulePreset[] = [
  {
    code: "pets_not_allowed",
    title: "Pets",
    description: "I do not want tenants with pets.",
    group: "tenant_requirement",
    icon: <Dog aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "maximum_occupants",
    title: "Too many people",
    description: "I want to set the highest number of people allowed.",
    group: "tenant_requirement",
    icon: <UsersRound aria-hidden="true" size={20} strokeWidth={2.6} />,
    needsNumber: {
      fieldName: "maximumOccupants",
      label: "Maximum number of people allowed",
      helperText: "Example: 4",
    },
  },
  {
    code: "residential_only",
    title: "Business use",
    description: "I only want people who will live there, not run a business.",
    group: "tenant_requirement",
    icon: <Home aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "children_under_5_not_allowed",
    title: "Children under 5",
    description: "I do not want children under 5 living there.",
    group: "tenant_requirement",
    icon: <Baby aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "minimum_monthly_income",
    title: "Low income",
    description: "I want to review tenants below a monthly income amount.",
    group: "tenant_requirement",
    icon: <CircleDollarSign aria-hidden="true" size={20} strokeWidth={2.6} />,
    needsNumber: {
      fieldName: "minimumMonthlyIncome",
      label: "Minimum monthly income",
      helperText: "Enter amount in naira, for example 250000.",
    },
  },
  {
    code: "guarantor_required",
    title: "No guarantor",
    description: "I want tenants who can provide a guarantor if approved.",
    group: "tenant_requirement",
    icon: <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "shortlet_not_allowed",
    title: "Short-let or Airbnb",
    description: "I do not want the property used for short-let or Airbnb.",
    group: "tenant_requirement",
    icon: <Hotel aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "subletting_not_allowed",
    title: "Subletting",
    description: "I do not want tenants who will rent it out to someone else.",
    group: "tenant_requirement",
    icon: <PackageCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "customer_facing_business_not_allowed",
    title: "Business with many visitors",
    description: "I do not want business that brings customers or staff.",
    group: "tenant_requirement",
    icon: <BriefcaseBusiness aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "heavy_generator_or_equipment_not_allowed",
    title: "Heavy generator or equipment",
    description: "I do not want heavy machines or large equipment.",
    group: "tenant_requirement",
    icon: <Wind aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "large_gatherings_not_allowed",
    title: "Parties or large gatherings",
    description: "I do not want regular parties or large gatherings.",
    group: "tenant_requirement",
    icon: <UsersRound aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "smoking_not_allowed",
    title: "Smoking",
    description: "No smoking in the property.",
    group: "house_rule",
    icon: <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "parking_rules",
    title: "Parking",
    description: "Tenant must follow parking rules.",
    group: "house_rule",
    icon: <Car aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "waste_disposal_rules",
    title: "Waste disposal",
    description: "Tenant must dispose waste properly.",
    group: "house_rule",
    icon: <PackageCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "quiet_hours",
    title: "Noise",
    description: "Tenant must avoid loud noise at night.",
    group: "house_rule",
    icon: <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "visitor_rules",
    title: "Visitors",
    description: "Tenant must follow visitor rules.",
    group: "house_rule",
    icon: <UsersRound aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "maintenance_reporting",
    title: "Repairs",
    description: "Tenant must report repairs properly.",
    group: "house_rule",
    icon: <ClipboardCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "no_structural_changes",
    title: "Changing the building",
    description: "Tenant must not change the building without approval.",
    group: "house_rule",
    icon: <Home aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "other_house_rule",
    title: "Other",
    description: "Add another simple house rule.",
    group: "house_rule",
    icon: <FileWarning aria-hidden="true" size={20} strokeWidth={2.6} />,
    needsOtherText: true,
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
    label: "House rule",
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

function getRuleCode(rule: PropertyRuleDetailRow) {
  return rule.metadata?.rule_code ?? "other_house_rule";
}

function isPresetAlreadyAdded(rules: PropertyRuleDetailRow[], code: string) {
  if (code === "other_house_rule") {
    return false;
  }

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
  const selectedNeedsOtherRule = selectedCodes.includes("other_house_rule");

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
          Tick everything that applies.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rulePresets
            .filter((preset) => preset.group === "tenant_requirement")
            .map((preset) => (
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
            />
          ) : null}

          {selectedNeedsMinimumIncome ? (
            <Input
              label="Minimum monthly income"
              name="minimumMonthlyIncome"
              type="number"
              min={1}
              required
              placeholder="Example: 250000"
            />
          ) : null}
        </div>
      ) : null}

      <section>
        <h3 className="text-base font-extrabold text-text-strong">
          House rules
        </h3>
        <p className="mt-1 text-sm leading-6 text-text-muted">
          These are rules tenants should know. They will not reject anyone by
          themselves.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rulePresets
            .filter((preset) => preset.group === "house_rule")
            .map((preset) => (
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

      {selectedNeedsOtherRule ? (
        <div className="space-y-4 rounded-card bg-background p-5">
          <Input
            label="Other rule title"
            name="otherRuleTitle"
            required
            placeholder="Example: Gate closes by 10pm"
          />

          <Textarea
            label="Explain the rule"
            name="otherRuleDescription"
            required
            placeholder="Write it in simple words."
          />

          <label className="flex items-start gap-3 rounded-button bg-white p-4">
            <input
              type="checkbox"
              name="requiresTenantAcknowledgement"
              defaultChecked
              className="mt-1 size-4 rounded border-border-soft text-primary focus:ring-primary"
            />

            <span>
              <span className="block text-sm font-extrabold text-text-strong">
                Tenant should agree to this rule
              </span>
              <span className="mt-1 block text-sm leading-6 text-text-muted">
                This will not reject anyone automatically.
              </span>
            </span>
          </label>
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
        Save Selected Rules
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
              : `Minimum monthly income: ₦${Number(
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
        title="No rule selected yet"
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

  const tenantRequirementRules = visibleRules.filter(
    (rule) => rule.enforcement !== "information_only",
  );

  const houseRules = visibleRules.filter(
    (rule) => rule.enforcement === "information_only",
  );

  return (
    <ToastProvider>
      <div className="space-y-6">
        <GuidedRuleCreateForm
          propertyId={propertyId}
          units={units}
          rules={rules}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-base font-extrabold text-text-strong">
                Things you are filtering
              </h3>
              <Badge tone="warning">{tenantRequirementRules.length}</Badge>
            </div>

            <PropertyRulesList
              propertyId={propertyId}
              rules={tenantRequirementRules}
            />
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-base font-extrabold text-text-strong">
                House rules
              </h3>
              <Badge tone="primary">{houseRules.length}</Badge>
            </div>

            <PropertyRulesList propertyId={propertyId} rules={houseRules} />
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
