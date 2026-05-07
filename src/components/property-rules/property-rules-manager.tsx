"use client";

import { useActionState } from "react";
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
  ClipboardCheck,
  FileWarning,
  Home,
  ShieldCheck,
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

const categoryOptions = [
  { label: "Occupancy", value: "occupancy" },
  { label: "Pets", value: "pets" },
  { label: "Payment", value: "payment" },
  { label: "Noise", value: "noise" },
  { label: "Business use", value: "business_use" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Safety", value: "safety" },
  { label: "Documentation", value: "documentation" },
  { label: "Other", value: "other" },
];

const enforcementOptions = [
  { label: "Information only", value: "information_only" },
  { label: "Landlord review required", value: "landlord_review" },
  { label: "Blocks onboarding", value: "blocks_onboarding" },
];

const appliesToOptions = [
  { label: "New tenants", value: "new_tenants" },
  { label: "All tenants", value: "all_tenants" },
  { label: "Renewing tenants", value: "renewing_tenants" },
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
    label: "Information only",
    tone: "success",
    description: "Shown to tenants for awareness.",
  },
  landlord_review: {
    label: "Review required",
    tone: "warning",
    description: "Landlord should review before approval.",
  },
  blocks_onboarding: {
    label: "Blocks onboarding",
    tone: "danger",
    description: "Later batches will prevent onboarding if this rule fails.",
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
    label: "Archived",
    tone: "danger",
  },
};

function formatCategory(value: PropertyRuleDetailRow["category"]) {
  return value.replaceAll("_", " ");
}

function formatAppliesTo(value: PropertyRuleDetailRow["applies_to"]) {
  if (value === "new_tenants") {
    return "New tenants";
  }

  if (value === "renewing_tenants") {
    return "Renewing tenants";
  }

  return "All tenants";
}

function PropertyRuleCreateForm({
  propertyId,
  units,
}: {
  propertyId: string;
  units: PropertyRulesManagerProps["units"];
}) {
  const [state, formAction, isPending] = useActionState(
    createPropertyRuleAction,
    initialPropertyRuleActionState,
  );

  const unitOptions = units.map((unit) => ({
    label: unit.building_name
      ? `${unit.unit_identifier} · ${unit.building_name}`
      : unit.unit_identifier,
    value: unit.id,
  }));

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Rule saved"
        errorTitle="Rule failed"
      />

      <input type="hidden" name="propertyId" value={propertyId} />

      <TrustNotice
        title="Simple rules for this property"
        description="Add only the rules tenants must understand before moving in. Keep the wording clear and short."
        icon={<ClipboardCheck aria-hidden="true" size={22} strokeWidth={2.6} />}
      />

      <Input
        label="Rule title"
        name="title"
        placeholder="Example: No pets without landlord approval"
        required
        error={state.fieldErrors?.title?.[0]}
      />

      <Textarea
        label="Rule description"
        name="description"
        placeholder="Explain the rule in simple language."
        required
        error={state.fieldErrors?.description?.[0]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Category"
          name="category"
          options={categoryOptions}
          defaultValue="other"
          required
          error={state.fieldErrors?.category?.[0]}
        />

        <Select
          label="Applies to"
          name="appliesTo"
          options={appliesToOptions}
          defaultValue="new_tenants"
          required
          error={state.fieldErrors?.appliesTo?.[0]}
        />
      </div>

      <Select
        label="Rule strength"
        name="enforcement"
        options={enforcementOptions}
        defaultValue="information_only"
        helperText="Use 'Blocks onboarding' only for important rules that must be satisfied before tenant approval."
        required
        error={state.fieldErrors?.enforcement?.[0]}
      />

      <Select
        label="Specific unit"
        name="unitId"
        options={unitOptions}
        placeholder="All units in this property"
        helperText="Leave this empty if the rule applies to the whole property."
        error={state.fieldErrors?.unitId?.[0]}
      />

      <Input
        label="Display order"
        name="sortOrder"
        type="number"
        min={0}
        defaultValue={0}
        helperText="Lower numbers appear first."
        error={state.fieldErrors?.sortOrder?.[0]}
      />

      <label className="flex items-start gap-3 rounded-button bg-background p-4">
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
            Later onboarding batches will use this for tenant confirmation.
          </span>
        </span>
      </label>

      <Button type="submit" isLoading={isPending} fullWidth>
        Save Property Rule
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

  const enforcement = enforcementCopy[rule.enforcement];
  const status = statusCopy[rule.status];

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
            <Badge tone="neutral">{formatCategory(rule.category)}</Badge>
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
            Applies to
          </p>
          <p className="mt-2 text-sm font-extrabold text-text-strong">
            {formatAppliesTo(rule.applies_to)}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Scope
          </p>
          <p className="mt-2 text-sm font-extrabold text-text-strong">
            {rule.units?.unit_identifier ?? "Whole property"}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Tenant acknowledgement
          </p>
          <p className="mt-2 text-sm font-extrabold text-text-strong">
            {rule.requires_tenant_acknowledgement ? "Required" : "Not required"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-button bg-primary-soft p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            aria-hidden="true"
            size={19}
            strokeWidth={2.6}
            className="mt-0.5 shrink-0 text-primary"
          />
          <p className="text-sm font-semibold leading-6 text-text-normal">
            {enforcement.description}
          </p>
        </div>
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
        title="No property rules yet"
        description="Add simple house rules such as pets, noise, payment expectations, or occupancy limits."
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
  const activeRules = rules.filter((rule) => rule.status === "active");
  const inactiveRules = rules.filter((rule) => rule.status === "inactive");

  return (
    <ToastProvider>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Home aria-hidden="true" size={20} strokeWidth={2.6} />
              <h3 className="text-base font-extrabold text-text-strong">
                Active Rules
              </h3>
              <Badge tone="success">{activeRules.length}</Badge>
            </div>

            <PropertyRulesList propertyId={propertyId} rules={activeRules} />
          </div>

          {inactiveRules.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h3 className="text-base font-extrabold text-text-strong">
                  Inactive Rules
                </h3>
                <Badge tone="neutral">{inactiveRules.length}</Badge>
              </div>

              <PropertyRulesList
                propertyId={propertyId}
                rules={inactiveRules}
              />
            </div>
          ) : null}
        </div>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <PropertyRuleCreateForm propertyId={propertyId} units={units} />
        </div>
      </div>
    </ToastProvider>
  );
}
