"use client";

import { useMemo, useState, useActionState } from "react";
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

type PresetGroup = "tenant_requirement" | "house_rule";

type RulePreset = {
  code: string;
  title: string;
  description: string;
  group: PresetGroup;
  icon: React.ReactNode;
  requiresNumber?: {
    fieldName: string;
    label: string;
    helperText: string;
  };
};

const rulePresets: RulePreset[] = [
  {
    code: "pets_not_allowed",
    title: "No pets",
    description: "Auto-decline if tenant declares pets.",
    group: "tenant_requirement",
    icon: <Dog aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "maximum_occupants",
    title: "Maximum occupants",
    description: "Auto-decline if declared occupants exceed the limit.",
    group: "tenant_requirement",
    icon: <UsersRound aria-hidden="true" size={20} strokeWidth={2.6} />,
    requiresNumber: {
      fieldName: "maximumOccupants",
      label: "Maximum occupants",
      helperText: "Example: 4",
    },
  },
  {
    code: "residential_only",
    title: "Residential only",
    description: "Auto-decline if tenant wants commercial use.",
    group: "tenant_requirement",
    icon: <Home aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "children_under_5_not_allowed",
    title: "No children under 5",
    description: "Auto-decline if children under 5 will live in the unit.",
    group: "tenant_requirement",
    icon: <Baby aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "minimum_monthly_income",
    title: "Minimum income",
    description: "Flag for landlord review if tenant income is below this.",
    group: "tenant_requirement",
    icon: <CircleDollarSign aria-hidden="true" size={20} strokeWidth={2.6} />,
    requiresNumber: {
      fieldName: "minimumMonthlyIncome",
      label: "Minimum monthly income",
      helperText: "Enter amount in naira, for example 250000.",
    },
  },
  {
    code: "guarantor_required",
    title: "Guarantor required",
    description: "KYC asks only if tenant can provide one if approved.",
    group: "tenant_requirement",
    icon: <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "shortlet_not_allowed",
    title: "No short-let / Airbnb",
    description: "Auto-decline if tenant wants short-let or daily rental use.",
    group: "tenant_requirement",
    icon: <Hotel aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "subletting_not_allowed",
    title: "No subletting",
    description: "Auto-decline if tenant intends to sublet.",
    group: "tenant_requirement",
    icon: <PackageCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "customer_facing_business_not_allowed",
    title: "No customer-facing business",
    description: "Auto-decline if business brings customers or staff.",
    group: "tenant_requirement",
    icon: <BriefcaseBusiness aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "heavy_generator_or_equipment_not_allowed",
    title: "No heavy generator/equipment",
    description: "Auto-decline if heavy equipment will be used.",
    group: "tenant_requirement",
    icon: <Wind aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "large_gatherings_not_allowed",
    title: "No regular large gatherings",
    description:
      "Auto-decline if tenant plans regular events or group gatherings.",
    group: "tenant_requirement",
    icon: <UsersRound aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "smoking_not_allowed",
    title: "No smoking",
    description: "House rule only. Does not auto-decline during KYC.",
    group: "house_rule",
    icon: <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "parking_rules",
    title: "Parking rules",
    description: "House rule for parking arrangement.",
    group: "house_rule",
    icon: <Car aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "waste_disposal_rules",
    title: "Waste disposal",
    description: "House rule for waste disposal.",
    group: "house_rule",
    icon: <PackageCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "quiet_hours",
    title: "Quiet hours",
    description: "House rule for noise control.",
    group: "house_rule",
    icon: <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "visitor_rules",
    title: "Visitors policy",
    description: "House rule for visitor expectations.",
    group: "house_rule",
    icon: <UsersRound aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "maintenance_reporting",
    title: "Maintenance reporting",
    description: "House rule for how tenants report repairs.",
    group: "house_rule",
    icon: <ClipboardCheck aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "no_structural_changes",
    title: "No structural changes",
    description: "House rule requiring approval before alterations.",
    group: "house_rule",
    icon: <Home aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  {
    code: "other_house_rule",
    title: "Other house rule",
    description: "Information-only custom rule. Not used for auto-decline.",
    group: "house_rule",
    icon: <FileWarning aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
];

const unitOptions = (units: PropertyRulesManagerProps["units"]) =>
  units.map((unit) => ({
    label: unit.building_name
      ? `${unit.unit_identifier} · ${unit.building_name}`
      : unit.unit_identifier,
    value: unit.id,
  }));

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
    label: "Archived",
    tone: "danger",
  },
};

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
    description: "This will not auto-decline a tenant.",
  },
  landlord_review: {
    label: "Review",
    tone: "warning",
    description: "This will flag the tenant for landlord review.",
  },
  blocks_onboarding: {
    label: "Auto-decline",
    tone: "danger",
    description: "This may auto-decline the tenant if their KYC answer fails.",
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
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function RulePresetButton({
  preset,
  isSelected,
  isDisabled,
  onSelect,
}: {
  preset: RulePreset;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (preset: RulePreset) => void;
}) {
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onSelect(preset)}
      className="flex min-h-24 w-full items-start gap-3 rounded-card border border-border-soft bg-white p-4 text-left shadow-card transition hover:border-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        {preset.icon}
      </span>

      <span>
        <span className="block text-sm font-extrabold text-text-strong">
          {preset.title}
        </span>
        <span className="mt-1 block text-sm leading-6 text-text-muted">
          {isDisabled ? "Already added." : preset.description}
        </span>
        {isSelected ? (
          <span className="mt-2 inline-flex rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">
            Selected
          </span>
        ) : null}
      </span>
    </button>
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
  const [selectedPreset, setSelectedPreset] = useState<RulePreset | null>(null);
  const [state, formAction, isPending] = useActionState(
    createPropertyRuleAction,
    initialPropertyRuleActionState,
  );

  const tenantRequirementPresets = rulePresets.filter(
    (preset) => preset.group === "tenant_requirement",
  );
  const houseRulePresets = rulePresets.filter(
    (preset) => preset.group === "house_rule",
  );

  return (
    <div className="space-y-6">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Rule saved"
        errorTitle="Rule failed"
      />

      <TrustNotice
        title="Only selected rules affect tenant KYC"
        description="Tenant KYC stays short. Tenuro will only ask questions for tenant requirements you add here. House rules are saved for acknowledgement and agreements later."
        icon={<ClipboardCheck aria-hidden="true" size={22} strokeWidth={2.6} />}
      />

      <div>
        <h3 className="text-base font-extrabold text-text-strong">
          Tenant Requirements
        </h3>
        <p className="mt-1 text-sm leading-6 text-text-muted">
          These may create KYC questions and can auto-decline or flag for
          review.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tenantRequirementPresets.map((preset) => (
            <RulePresetButton
              key={preset.code}
              preset={preset}
              isSelected={selectedPreset?.code === preset.code}
              isDisabled={isPresetAlreadyAdded(rules, preset.code)}
              onSelect={setSelectedPreset}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-extrabold text-text-strong">
          House Rules
        </h3>
        <p className="mt-1 text-sm leading-6 text-text-muted">
          These do not auto-decline tenants. They are for acknowledgement and
          agreements.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {houseRulePresets.map((preset) => (
            <RulePresetButton
              key={preset.code}
              preset={preset}
              isSelected={selectedPreset?.code === preset.code}
              isDisabled={isPresetAlreadyAdded(rules, preset.code)}
              onSelect={setSelectedPreset}
            />
          ))}
        </div>
      </div>

      {selectedPreset ? (
        <form
          action={formAction}
          className="space-y-5 rounded-card bg-background p-5"
        >
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="ruleCode" value={selectedPreset.code} />

          <div>
            <p className="text-sm font-bold text-text-muted">Selected rule</p>
            <p className="mt-1 text-lg font-extrabold text-text-strong">
              {selectedPreset.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              {selectedPreset.description}
            </p>
          </div>

          <Select
            label="Specific unit"
            name="unitId"
            options={unitOptions(units)}
            placeholder="All units in this property"
            helperText="Leave empty if this rule applies to the whole property."
            error={state.fieldErrors?.unitId?.[0]}
          />

          {selectedPreset.requiresNumber ? (
            <Input
              label={selectedPreset.requiresNumber.label}
              name={selectedPreset.requiresNumber.fieldName}
              type="number"
              min={1}
              required
              helperText={selectedPreset.requiresNumber.helperText}
            />
          ) : null}

          {selectedPreset.code === "other_house_rule" ? (
            <>
              <Input
                label="Rule title"
                name="title"
                required
                placeholder="Example: Gate closes by 10pm"
                error={state.fieldErrors?.title?.[0]}
              />

              <Textarea
                label="Rule description"
                name="description"
                required
                placeholder="Explain the rule simply."
                error={state.fieldErrors?.description?.[0]}
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
                    Tenant should acknowledge this rule
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-text-muted">
                    This remains information-only and will not auto-decline.
                  </span>
                </span>
              </label>
            </>
          ) : (
            <Textarea
              label="Optional wording adjustment"
              name="description"
              placeholder={selectedPreset.description}
              helperText="Leave this empty to use the standard wording."
              error={state.fieldErrors?.description?.[0]}
            />
          )}

          <Input
            label="Display order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={0}
            helperText="Lower numbers appear first."
            error={state.fieldErrors?.sortOrder?.[0]}
          />

          <Button type="submit" isLoading={isPending} fullWidth>
            Add Selected Rule
          </Button>
        </form>
      ) : null}
    </div>
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
  const code = getRuleCode(rule);
  const maximumOccupants = getConfigNumber(rule, "maximumOccupants");
  const minimumMonthlyIncome = getConfigNumber(rule, "minimumMonthlyIncome");

  return (
    <article className="rounded-card border border-border-soft bg-white p-5 shadow-card">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Rule archived"
        errorTitle="Archive failed"
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
              Archive
            </Button>
          </form>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            KYC impact
          </p>
          <p className="mt-2 text-sm font-extrabold text-text-strong">
            {rule.enforcement === "information_only"
              ? "No KYC question"
              : "KYC question if selected"}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Applies to
          </p>
          <p className="mt-2 text-sm font-extrabold text-text-strong">
            {rule.applies_to.replaceAll("_", " ")}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Rule code
          </p>
          <p className="mt-2 wrap-break-word text-sm font-extrabold text-text-strong">
            {code.replaceAll("_", " ")}
          </p>
        </div>
      </div>

      {maximumOccupants || minimumMonthlyIncome ? (
        <div className="mt-4 rounded-button bg-primary-soft p-4">
          <p className="text-sm font-extrabold text-text-strong">
            {maximumOccupants
              ? `Maximum occupants: ${maximumOccupants}`
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
        title="No selected rules yet"
        description="Choose from the preset tenant requirements or house rules. Only selected tenant requirements will appear in KYC later."
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
                Selected Tenant Requirements
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
                Selected House Rules
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
