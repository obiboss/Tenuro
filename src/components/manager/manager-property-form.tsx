"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createManagerPropertyAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import type { ManagerManagementFeeType } from "@/constants/manager";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import {
  getNigeriaLgaOptions,
  getNigeriaStateOptions,
} from "@/lib/nigeria-state-lga";
import { LANDLORD_CHARGE_PRESETS } from "@/lib/landlord-charge-presets";
import { runOfflineCapableFormAction } from "@/lib/offline/offline-form.client";
import { saveManagerPropertyOffline } from "@/lib/offline/operational-mutations.client";
import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerPropertyFormProps = {
  landlordClients: ManagerLandlordClientRow[];
};

type OwnerMode = "existing" | "new";
type FormStep =
  "details" | "rent" | "charges" | "rules" | "existing" | "review";

function getInvalidFormStep(
  fieldErrors: Record<string, string[]> | undefined,
): FormStep | null {
  if (!fieldErrors) {
    return null;
  }

  const hasError = (...fields: string[]) =>
    fields.some((field) => (fieldErrors[field]?.length ?? 0) > 0);

  if (
    hasError(
      "landlordClientId",
      "landlordName",
      "landlordPhone",
      "landlordEmail",
      "landlordAddress",
      "propertyName",
      "propertyAddress",
      "city",
      "state",
      "lga",
    )
  ) {
    return "details";
  }

  if (
    hasError(
      "collectionMode",
      "managementFeeType",
      "managementFeeValue",
      "paystackChargeBearer",
      "paymentReceiver",
    )
  ) {
    return "rent";
  }

  if (hasError("serviceCharges")) {
    return "charges";
  }

  if (hasError("propertyRules")) {
    return "rules";
  }

  if (hasError("hasExistingTenants")) {
    return "existing";
  }

  return null;
}

type ServiceChargeDraft = {
  id: string;
  chargeCode: string | null;
  chargeName: string;
  description: string;
  amount: string;
  isRequiredBeforeMoveIn: boolean;
  customName: string;
};

type PropertyRuleDraft = {
  id: string;
  title: string;
  description: string;
  category: string;
  appliesTo: "all_tenants" | "new_tenants" | "renewing_tenants";
  requiresTenantAcknowledgement: boolean;
};

const ruleCategoryOptions = [
  ["occupancy", "Occupancy"],
  ["pets", "Pets"],
  ["payment", "Payment"],
  ["noise", "Noise"],
  ["business_use", "Business use"],
  ["maintenance", "Maintenance"],
  ["safety", "Safety"],
  ["documentation", "Documentation"],
  ["other", "Other"],
] as const;

const ruleAppliesToOptions = [
  ["all_tenants", "All tenants"],
  ["new_tenants", "New tenants"],
  ["renewing_tenants", "Renewing tenants"],
] as const;

function normaliseRequiredText(value: string) {
  return value.trim().length > 0;
}

function formatNaira(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "₦0";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function createDraftId() {
  return crypto.randomUUID();
}

function createServiceChargeDraft(presetId: string): ServiceChargeDraft {
  const preset =
    LANDLORD_CHARGE_PRESETS.find((item) => item.id === presetId) ??
    LANDLORD_CHARGE_PRESETS[0];

  return {
    id: createDraftId(),
    chargeCode: preset.id === "other" ? null : preset.id,
    chargeName: preset.id === "other" ? "" : preset.name,
    description: preset.defaultDescription,
    amount: "",
    isRequiredBeforeMoveIn: preset.isRequiredBeforeMoveIn,
    customName: "",
  };
}

function createPropertyRuleDraft(): PropertyRuleDraft {
  return {
    id: createDraftId(),
    title: "",
    description: "",
    category: "other",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  };
}

function getServiceChargePayload(charges: ServiceChargeDraft[]) {
  return charges.map((charge) => ({
    chargeCode: charge.chargeCode,
    chargeName:
      charge.chargeCode === null ? charge.customName.trim() : charge.chargeName,
    description: charge.description,
    amount: charge.amount,
    isRequiredBeforeMoveIn: charge.isRequiredBeforeMoveIn,
  }));
}

function getPropertyRulePayload(rules: PropertyRuleDraft[]) {
  return rules.map((rule) => ({
    title: rule.title,
    description: rule.description,
    category: rule.category,
    appliesTo: rule.appliesTo,
    requiresTenantAcknowledgement: rule.requiresTenantAcknowledgement,
  }));
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border-soft py-3 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-text-strong">{value}</p>
    </div>
  );
}

function StepButton({
  active,
  label,
  description,
}: {
  active: boolean;
  label: string;
  description: string;
}) {
  return (
    <div
      className={`rounded-card border px-4 py-3 ${
        active
          ? "border-primary bg-primary-soft"
          : "border-border-soft bg-white"
      }`}
    >
      <p
        className={`text-sm font-black ${
          active ? "text-primary" : "text-text-strong"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
        {description}
      </p>
    </div>
  );
}

export function ManagerPropertyForm({
  landlordClients,
}: ManagerPropertyFormProps) {
  const router = useRouter();
  const offlineCapableAction = useCallback(
    (previousState: typeof initialManagerActionState, formData: FormData) =>
      runOfflineCapableFormAction({
        previousState,
        formData,
        onlineAction: createManagerPropertyAction,
        saveOffline: saveManagerPropertyOffline,
      }),
    [],
  );
  const [state, formAction, isPending] = useActionState(
    offlineCapableAction,
    initialManagerActionState,
  );

  const stateOptions = useMemo(() => getNigeriaStateOptions(), []);
  const [step, setStep] = useState<FormStep>("details");

  const [ownerMode, setOwnerMode] = useState<OwnerMode>(
    landlordClients.length > 0 ? "existing" : "new",
  );

  const [showMoreLandlordDetails, setShowMoreLandlordDetails] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const [selectedLandlordId, setSelectedLandlordId] = useState(
    landlordClients[0]?.id ?? "",
  );

  const [newLandlordName, setNewLandlordName] = useState("");
  const [newLandlordPhone, setNewLandlordPhone] = useState("");
  const [newLandlordEmail, setNewLandlordEmail] = useState("");
  const [newLandlordAddress, setNewLandlordAddress] = useState("");

  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [stateName, setStateName] = useState("");
  const [lga, setLga] = useState("");
  const [city, setCity] = useState("");
  const [hasExistingTenants, setHasExistingTenants] = useState(false);

  const [hasManagementFee, setHasManagementFee] = useState(true);
  const [feeType, setFeeType] =
    useState<ManagerManagementFeeType>("percentage");
  const [managementFeeValue, setManagementFeeValue] = useState("10");
  const [hasNoServiceCharges, setHasNoServiceCharges] = useState(false);
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeDraft[]>(
    [],
  );
  const [propertyRules, setPropertyRules] = useState<PropertyRuleDraft[]>([]);
  const [notes, setNotes] = useState("");

  const lgaOptions = useMemo(
    () => getNigeriaLgaOptions(stateName),
    [stateName],
  );

  const useExistingLandlord =
    ownerMode === "existing" && landlordClients.length > 0;

  const selectedLandlord = useMemo(
    () =>
      landlordClients.find((client) => client.id === selectedLandlordId) ??
      null,
    [landlordClients, selectedLandlordId],
  );

  const landlordSummary = useExistingLandlord
    ? (selectedLandlord?.landlord_name ?? "Select landlord")
    : newLandlordName.trim() || "New landlord";

  const locationSummary = [city, lga, stateName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  const managementFeeSummary = !hasManagementFee
    ? "No management fee"
    : feeType === "percentage"
      ? `${managementFeeValue || "0"}%`
      : formatNaira(managementFeeValue);

  const effectiveServiceCharges = hasNoServiceCharges ? [] : serviceCharges;
  const serviceChargeTotal = effectiveServiceCharges.reduce((total, charge) => {
    const amount = Number(charge.amount);

    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
  const serviceChargesJson = JSON.stringify(
    getServiceChargePayload(effectiveServiceCharges),
  );
  const propertyRulesJson = JSON.stringify(
    getPropertyRulePayload(propertyRules),
  );

  const canContinueFromDetails = useMemo(() => {
    const hasLandlord = useExistingLandlord
      ? normaliseRequiredText(selectedLandlordId)
      : normaliseRequiredText(newLandlordName) &&
        normaliseRequiredText(newLandlordPhone);

    return (
      hasLandlord &&
      normaliseRequiredText(propertyName) &&
      normaliseRequiredText(propertyAddress) &&
      normaliseRequiredText(stateName) &&
      normaliseRequiredText(lga)
    );
  }, [
    lga,
    newLandlordName,
    newLandlordPhone,
    propertyAddress,
    propertyName,
    selectedLandlordId,
    stateName,
    useExistingLandlord,
  ]);

  function handleStateChange(nextState: string) {
    setStateName(nextState);
    setLga("");
  }

  const resetFormState = useCallback(() => {
    setStep("details");
    setOwnerMode(landlordClients.length > 0 ? "existing" : "new");
    setSelectedLandlordId(landlordClients[0]?.id ?? "");
    setNewLandlordName("");
    setNewLandlordPhone("");
    setNewLandlordEmail("");
    setNewLandlordAddress("");
    setPropertyName("");
    setPropertyAddress("");
    setStateName("");
    setLga("");
    setCity("");
    setHasExistingTenants(false);
    setHasManagementFee(true);
    setFeeType("percentage");
    setManagementFeeValue("10");
    setHasNoServiceCharges(false);
    setServiceCharges([]);
    setPropertyRules([]);
    setNotes("");
    setShowMoreLandlordDetails(false);
    setShowNote(false);
  }, [landlordClients]);

  useEffect(() => {
    if (!state.ok || !state.nextHref || state.offlineSaved) {
      return;
    }

    const nextHref = state.nextHref;

    const timeoutId = window.setTimeout(() => {
      resetFormState();
      router.push(nextHref);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [resetFormState, router, state.nextHref, state.offlineSaved, state.ok]);

  useEffect(() => {
    if (state.ok) {
      return;
    }

    const invalidStep = getInvalidFormStep(state.fieldErrors);

    if (!invalidStep) {
      return;
    }

    setStep(invalidStep);

    if (
      state.fieldErrors?.landlordEmail?.length ||
      state.fieldErrors?.landlordAddress?.length
    ) {
      setShowMoreLandlordDetails(true);
    }
  }, [state.fieldErrors, state.ok]);

  function addServiceCharge(presetId: string) {
    setHasNoServiceCharges(false);
    setServiceCharges((current) => [
      ...current,
      createServiceChargeDraft(presetId),
    ]);
  }

  function updateServiceCharge(
    id: string,
    updater: (charge: ServiceChargeDraft) => ServiceChargeDraft,
  ) {
    setServiceCharges((current) =>
      current.map((charge) => (charge.id === id ? updater(charge) : charge)),
    );
  }

  function removeServiceCharge(id: string) {
    setServiceCharges((current) =>
      current.filter((charge) => charge.id !== id),
    );
  }

  function addPropertyRule() {
    setPropertyRules((current) => [...current, createPropertyRuleDraft()]);
  }

  function updatePropertyRule(
    id: string,
    updater: (rule: PropertyRuleDraft) => PropertyRuleDraft,
  ) {
    setPropertyRules((current) =>
      current.map((rule) => (rule.id === id ? updater(rule) : rule)),
    );
  }

  function removePropertyRule(id: string) {
    setPropertyRules((current) => current.filter((rule) => rule.id !== id));
  }

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Property saved"
        errorTitle="Property could not be saved"
      />

      <input type="hidden" name="ownerMode" value={ownerMode} />
      <input type="hidden" name="landlordClientId" value={selectedLandlordId} />
      <input type="hidden" name="newLandlordName" value={newLandlordName} />
      <input type="hidden" name="newLandlordPhone" value={newLandlordPhone} />
      <input type="hidden" name="newLandlordEmail" value={newLandlordEmail} />
      <input
        type="hidden"
        name="newLandlordAddress"
        value={newLandlordAddress}
      />
      <input type="hidden" name="newLandlordNotes" value="" />

      <input type="hidden" name="propertyName" value={propertyName} />
      <input type="hidden" name="propertyAddress" value={propertyAddress} />
      <input type="hidden" name="state" value={stateName} />
      <input type="hidden" name="lga" value={lga} />
      <input type="hidden" name="city" value={city} />
      <input
        type="hidden"
        name="hasExistingTenants"
        value={hasExistingTenants ? "true" : "false"}
      />

      <input type="hidden" name="collectionMode" value="manager_collects" />
      <input type="hidden" name="paymentReceiver" value="manager" />
      <input type="hidden" name="paystackChargeBearer" value="tenant" />
      <input type="hidden" name="managementFeeType" value={feeType} />
      <input
        type="hidden"
        name="managementFeeValue"
        value={hasManagementFee ? managementFeeValue : "0"}
      />
      <input
        type="hidden"
        name="serviceChargesJson"
        value={serviceChargesJson}
      />
      <input type="hidden" name="propertyRulesJson" value={propertyRulesJson} />
      <input type="hidden" name="notes" value={notes} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-card border border-border-soft bg-white shadow-sm">
          <div className="border-b border-border-soft p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <StepButton
                active={step === "details"}
                label="1. Details"
                description="Landlord, address, and location."
              />
              <StepButton
                active={step === "rent"}
                label="2. Collection"
                description="Manager collection and management fee."
              />
              <StepButton
                active={step === "charges"}
                label="3. Charges"
                description="Move-in service charges."
              />
              <StepButton
                active={step === "rules"}
                label="4. Rules"
                description="Agreement rules."
              />
              <StepButton
                active={step === "existing"}
                label="5. Tenants"
                description="Current occupants."
              />
              <StepButton
                active={step === "review"}
                label="6. Review"
                description="Confirm and create."
              />
            </div>
          </div>

          <div className="space-y-5 p-4 md:p-5">
            {state.message ? (
              <div
                role="alert"
                className={
                  state.ok
                    ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                    : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
                }
              >
                {state.message}

                {state.ok ? (
                  <div className="mt-3">
                    <Link
                      href={state.nextHref ?? "/manager/properties"}
                      prefetch={false}
                      className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                    >
                      {state.nextHref ? "Add units" : "View properties"}
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === "details" ? (
              <>
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Landlord
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      Choose the owner first so this property is attached
                      correctly.
                    </p>
                  </div>

                  <div className="inline-flex rounded-button border border-border-soft bg-surface p-1">
                    <button
                      type="button"
                      disabled={landlordClients.length === 0}
                      onClick={() => setOwnerMode("existing")}
                      className={`min-h-10 rounded-button px-4 text-sm font-black transition ${
                        useExistingLandlord
                          ? "bg-white text-primary shadow-sm"
                          : "text-text-muted hover:text-primary"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      Saved landlord
                    </button>

                    <button
                      type="button"
                      onClick={() => setOwnerMode("new")}
                      className={`min-h-10 rounded-button px-4 text-sm font-black transition ${
                        ownerMode === "new"
                          ? "bg-white text-primary shadow-sm"
                          : "text-text-muted hover:text-primary"
                      }`}
                    >
                      New landlord
                    </button>
                  </div>

                  {useExistingLandlord ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="manager-property-landlord"
                        className="text-sm font-bold text-text-strong"
                      >
                        Saved landlord
                      </label>
                      <select
                        id="manager-property-landlord"
                        value={selectedLandlordId}
                        onChange={(event) =>
                          setSelectedLandlordId(event.target.value)
                        }
                        className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                        required
                      >
                        {landlordClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.landlord_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          id="newLandlordNameVisible"
                          label="Landlord name"
                          value={newLandlordName}
                          onChange={(event) =>
                            setNewLandlordName(event.target.value)
                          }
                          placeholder="Example: Mr Chukwuma Okeke"
                          error={state.fieldErrors?.landlordName?.[0]}
                          required
                        />

                        <Input
                          id="newLandlordPhoneVisible"
                          label="Landlord phone"
                          value={newLandlordPhone}
                          onChange={(event) =>
                            setNewLandlordPhone(event.target.value)
                          }
                          placeholder="Example: 08012345678"
                          error={state.fieldErrors?.landlordPhone?.[0]}
                          required
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowMoreLandlordDetails((current) => !current)
                        }
                        className="text-sm font-black text-primary underline-offset-4 hover:underline"
                      >
                        {showMoreLandlordDetails
                          ? "Hide optional landlord details"
                          : "Add optional landlord details"}
                      </button>

                      {showMoreLandlordDetails ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input
                            id="newLandlordEmailVisible"
                            label="Landlord email"
                            type="email"
                            value={newLandlordEmail}
                            onChange={(event) =>
                              setNewLandlordEmail(event.target.value)
                            }
                            placeholder="Optional"
                            error={state.fieldErrors?.landlordEmail?.[0]}
                          />

                          <Input
                            id="newLandlordAddressVisible"
                            label="Landlord address"
                            value={newLandlordAddress}
                            onChange={(event) =>
                              setNewLandlordAddress(event.target.value)
                            }
                            placeholder="Optional"
                            error={state.fieldErrors?.landlordAddress?.[0]}
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Property
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      Add the property address and location.
                    </p>
                  </div>

                  <Input
                    id="propertyNameVisible"
                    label="Property name"
                    value={propertyName}
                    onChange={(event) => setPropertyName(event.target.value)}
                    placeholder="Example: Dominion Heights"
                    error={state.fieldErrors?.propertyName?.[0]}
                    required
                  />

                  <Input
                    id="propertyAddressVisible"
                    label="Property address"
                    value={propertyAddress}
                    onChange={(event) => setPropertyAddress(event.target.value)}
                    placeholder="Example: 12 Admiralty Way"
                    error={state.fieldErrors?.propertyAddress?.[0]}
                    required
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="manager-property-state"
                        className="text-sm font-bold text-text-strong"
                      >
                        State
                      </label>
                      <select
                        id="manager-property-state"
                        value={stateName}
                        onChange={(event) =>
                          handleStateChange(event.target.value)
                        }
                        className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                        required
                      >
                        <option value="">Select state</option>
                        {stateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="manager-property-lga"
                        className="text-sm font-bold text-text-strong"
                      >
                        LGA
                      </label>
                      <select
                        id="manager-property-lga"
                        value={lga}
                        onChange={(event) => setLga(event.target.value)}
                        className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                        required
                      >
                        <option value="">Select LGA</option>
                        {lgaOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      id="cityVisible"
                      label="City / area"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Optional"
                      error={state.fieldErrors?.city?.[0]}
                    />
                  </div>
                </section>

                <div className="flex justify-end border-t border-border-soft pt-4">
                  <Button
                    type="button"
                    onClick={() => setStep("rent")}
                    disabled={!canContinueFromDetails}
                  >
                    Continue
                  </Button>
                </div>
              </>
            ) : step === "rent" ? (
              <>
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Rent collection
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      BOPA Manager currently uses one simple collection model.
                    </p>
                  </div>

                  <div className="rounded-card border border-primary/20 bg-primary-soft p-4">
                    <p className="text-base font-black text-text-strong">
                      Manager collects rent
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                      Tenant pays through BOPA/Paystack. The payment settles to
                      the manager’s verified payout account. BOPA calculates the
                      manager fee and landlord balance automatically.
                    </p>
                  </div>

                  <div className="rounded-card border border-warning/20 bg-warning-soft p-4">
                    <p className="text-sm font-black text-text-strong">
                      Payout account required
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      Rent payment links will only work after the manager payout
                      account has been verified on Paystack.
                    </p>
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Management fee
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      BOPA uses this to calculate the manager commission and
                      landlord balance.
                    </p>
                  </div>

                  <div className="inline-flex rounded-button border border-border-soft bg-surface p-1">
                    <button
                      type="button"
                      onClick={() => setHasManagementFee(true)}
                      className={`min-h-10 rounded-button px-4 text-sm font-black transition ${
                        hasManagementFee
                          ? "bg-white text-primary shadow-sm"
                          : "text-text-muted hover:text-primary"
                      }`}
                    >
                      Has fee
                    </button>

                    <button
                      type="button"
                      onClick={() => setHasManagementFee(false)}
                      className={`min-h-10 rounded-button px-4 text-sm font-black transition ${
                        !hasManagementFee
                          ? "bg-white text-primary shadow-sm"
                          : "text-text-muted hover:text-primary"
                      }`}
                    >
                      No fee
                    </button>
                  </div>

                  {hasManagementFee ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor="manager-fee-type"
                          className="text-sm font-bold text-text-strong"
                        >
                          Fee type
                        </label>
                        <select
                          id="manager-fee-type"
                          value={feeType}
                          onChange={(event) =>
                            setFeeType(
                              event.target.value as ManagerManagementFeeType,
                            )
                          }
                          className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="flat">Flat amount</option>
                        </select>
                      </div>

                      {feeType === "percentage" ? (
                        <Input
                          id="managementFeeValueVisible"
                          label="Fee percentage"
                          type="number"
                          min="0"
                          step="0.01"
                          value={managementFeeValue}
                          onChange={(event) =>
                            setManagementFeeValue(event.target.value)
                          }
                          placeholder="10"
                          error={state.fieldErrors?.managementFeeValue?.[0]}
                          required
                        />
                      ) : (
                        <CurrencyInput
                          label="Flat fee"
                          name="managementFeeValueVisible"
                          value={managementFeeValue}
                          onValueChange={setManagementFeeValue}
                          placeholder="0.00"
                          error={state.fieldErrors?.managementFeeValue?.[0]}
                          required
                        />
                      )}
                    </div>
                  ) : null}
                </section>

                <section className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowNote((current) => !current)}
                    className="text-sm font-black text-primary underline-offset-4 hover:underline"
                  >
                    {showNote ? "Hide note" : "Add internal note"}
                  </button>

                  {showNote ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="manager-property-note"
                        className="text-sm font-bold text-text-strong"
                      >
                        Internal note
                      </label>
                      <textarea
                        id="manager-property-note"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={3}
                        placeholder="Optional"
                        className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                      />
                    </div>
                  ) : null}
                </section>

                <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep("details")}
                  >
                    Back
                  </Button>

                  <Button type="button" onClick={() => setStep("charges")}>
                    Continue
                  </Button>
                </div>
              </>
            ) : step === "charges" ? (
              <>
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Service charges
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      Add any charges tenants must pay before moving in.
                    </p>
                  </div>

                  <label className="flex gap-3 rounded-card border border-border-soft bg-surface p-4 text-sm font-semibold text-text-strong">
                    <input
                      type="checkbox"
                      checked={hasNoServiceCharges}
                      onChange={(event) =>
                        setHasNoServiceCharges(event.target.checked)
                      }
                      className="mt-1 size-4 rounded border-border-soft text-primary focus:ring-primary"
                    />
                    <span>This property has no service charge</span>
                  </label>

                  {!hasNoServiceCharges ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {LANDLORD_CHARGE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => addServiceCharge(preset.id)}
                            className="inline-flex min-h-10 items-center rounded-button border border-border-soft bg-white px-3 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>

                      {serviceCharges.length > 0 ? (
                        <div className="space-y-3">
                          {serviceCharges.map((charge) => (
                            <div
                              key={charge.id}
                              className="rounded-card border border-border-soft bg-white p-4"
                            >
                              <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                                {charge.chargeCode === null ? (
                                  <Input
                                    label="Item name"
                                    value={charge.customName}
                                    onChange={(event) =>
                                      updateServiceCharge(
                                        charge.id,
                                        (item) => ({
                                          ...item,
                                          customName: event.target.value,
                                        }),
                                      )
                                    }
                                    placeholder="Example: Security"
                                    required
                                  />
                                ) : (
                                  <Input
                                    label="Item name"
                                    value={charge.chargeName}
                                    onChange={(event) =>
                                      updateServiceCharge(
                                        charge.id,
                                        (item) => ({
                                          ...item,
                                          chargeName: event.target.value,
                                        }),
                                      )
                                    }
                                    required
                                  />
                                )}

                                <CurrencyInput
                                  label="Amount"
                                  name={`charge-${charge.id}`}
                                  value={charge.amount}
                                  onValueChange={(value) =>
                                    updateServiceCharge(charge.id, (item) => ({
                                      ...item,
                                      amount: value,
                                    }))
                                  }
                                  placeholder="0.00"
                                  required
                                />

                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeServiceCharge(charge.id)
                                    }
                                    className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
                          No service charges added.
                        </p>
                      )}

                      <p className="rounded-card bg-primary-soft p-4 text-sm font-black text-text-strong">
                        Service charge total:{" "}
                        {formatNaira(String(serviceChargeTotal))}
                      </p>
                    </>
                  ) : null}

                  {state.fieldErrors?.serviceCharges?.[0] ? (
                    <p className="text-sm font-semibold text-danger">
                      {state.fieldErrors.serviceCharges[0]}
                    </p>
                  ) : null}
                </section>

                <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep("rent")}
                  >
                    Back
                  </Button>

                  <Button type="button" onClick={() => setStep("rules")}>
                    Continue
                  </Button>
                </div>
              </>
            ) : step === "rules" ? (
              <>
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Property rules
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      Add important rules tenants should know before accepting
                      the agreement.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addPropertyRule}
                  >
                    Add rule
                  </Button>

                  {propertyRules.length > 0 ? (
                    <div className="space-y-3">
                      {propertyRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="space-y-3 rounded-card border border-border-soft bg-white p-4"
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              label="Rule title"
                              value={rule.title}
                              onChange={(event) =>
                                updatePropertyRule(rule.id, (item) => ({
                                  ...item,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="Example: No short-let"
                              required
                            />

                            <div className="space-y-2">
                              <label className="text-sm font-bold text-text-strong">
                                Applies to
                              </label>
                              <select
                                value={rule.appliesTo}
                                onChange={(event) =>
                                  updatePropertyRule(rule.id, (item) => ({
                                    ...item,
                                    appliesTo: event.target
                                      .value as PropertyRuleDraft["appliesTo"],
                                  }))
                                }
                                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                              >
                                {ruleAppliesToOptions.map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-text-strong">
                              Description
                            </label>
                            <textarea
                              value={rule.description}
                              onChange={(event) =>
                                updatePropertyRule(rule.id, (item) => ({
                                  ...item,
                                  description: event.target.value,
                                }))
                              }
                              rows={3}
                              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                              required
                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-text-strong">
                                Category
                              </label>
                              <select
                                value={rule.category}
                                onChange={(event) =>
                                  updatePropertyRule(rule.id, (item) => ({
                                    ...item,
                                    category: event.target.value,
                                  }))
                                }
                                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                              >
                                {ruleCategoryOptions.map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <label className="flex items-center gap-3 rounded-card bg-surface p-4 text-sm font-semibold text-text-strong">
                              <input
                                type="checkbox"
                                checked={rule.requiresTenantAcknowledgement}
                                onChange={(event) =>
                                  updatePropertyRule(rule.id, (item) => ({
                                    ...item,
                                    requiresTenantAcknowledgement:
                                      event.target.checked,
                                  }))
                                }
                                className="size-4 rounded border-border-soft text-primary focus:ring-primary"
                              />
                              Require tenant acknowledgement
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => removePropertyRule(rule.id)}
                            className="text-sm font-black text-danger underline-offset-4 hover:underline"
                          >
                            Remove rule
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
                      No special property rules.
                    </p>
                  )}

                  {state.fieldErrors?.propertyRules?.[0] ? (
                    <p className="text-sm font-semibold text-danger">
                      {state.fieldErrors.propertyRules[0]}
                    </p>
                  ) : null}
                </section>

                <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep("charges")}
                  >
                    Back
                  </Button>

                  <Button type="button" onClick={() => setStep("existing")}>
                    Continue
                  </Button>
                </div>
              </>
            ) : step === "existing" ? (
              <>
                <section className="space-y-3">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Existing tenants
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      Are there tenants already living in this property?
                    </p>
                  </div>

                  <div className="inline-flex rounded-button border border-border-soft bg-surface p-1">
                    <button
                      type="button"
                      onClick={() => setHasExistingTenants(true)}
                      className={`min-h-10 rounded-button px-4 text-sm font-black transition ${
                        hasExistingTenants
                          ? "bg-white text-primary shadow-sm"
                          : "text-text-muted hover:text-primary"
                      }`}
                    >
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={() => setHasExistingTenants(false)}
                      className={`min-h-10 rounded-button px-4 text-sm font-black transition ${
                        !hasExistingTenants
                          ? "bg-white text-primary shadow-sm"
                          : "text-text-muted hover:text-primary"
                      }`}
                    >
                      No
                    </button>
                  </div>

                  <p className="rounded-card bg-primary-soft p-4 text-sm font-semibold leading-6 text-text-muted">
                    Continue to the review screen, then tap Save property. This
                    step does not save the property yet.
                  </p>
                </section>

                <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep("rules")}
                  >
                    Back
                  </Button>

                  <Button type="button" onClick={() => setStep("review")}>
                    Continue to review
                  </Button>
                </div>
              </>
            ) : (
              <>
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Review and create
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      Confirm the property setup, then tap Save property. If you
                      are offline, it will be stored on this device and queued
                      for automatic sync.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SummaryItem label="Landlord" value={landlordSummary} />
                    <SummaryItem
                      label="Property"
                      value={propertyName.trim() || "Not set"}
                    />
                    <SummaryItem
                      label="Service charges"
                      value={
                        effectiveServiceCharges.length === 0
                          ? "No service charges"
                          : `${effectiveServiceCharges.length} items - ${formatNaira(
                              String(serviceChargeTotal),
                            )}`
                      }
                    />
                    <SummaryItem
                      label="Property rules"
                      value={
                        propertyRules.length === 0
                          ? "No special property rules"
                          : `${propertyRules.length} rules`
                      }
                    />
                  </div>
                </section>

                <div className="flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep("existing")}
                  >
                    Back
                  </Button>

                  <Button
                    type="submit"
                    isLoading={isPending}
                    disabled={state.ok}
                  >
                    {state.offlineSaved
                      ? "Saved on this device"
                      : "Save property"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="rounded-card border border-border-soft bg-white p-4 shadow-sm lg:self-start">
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Summary
          </h2>

          <div className="mt-4">
            <SummaryItem label="Landlord" value={landlordSummary} />
            <SummaryItem
              label="Property"
              value={propertyName.trim() || "Not set"}
            />
            <SummaryItem
              label="Location"
              value={locationSummary || "Not set"}
            />
            <SummaryItem
              label="Existing tenants"
              value={hasExistingTenants ? "Yes" : "No"}
            />
            <SummaryItem label="Rent collection" value="Manager collects" />
            <SummaryItem
              label="Payment receiver"
              value="Manager verified Paystack account"
            />
            <SummaryItem label="Paystack charge" value="Tenant pays" />
            <SummaryItem label="Management fee" value={managementFeeSummary} />
            <SummaryItem
              label="Service charges"
              value={
                effectiveServiceCharges.length === 0
                  ? "None"
                  : formatNaira(String(serviceChargeTotal))
              }
            />
            <SummaryItem
              label="Property rules"
              value={
                propertyRules.length === 0
                  ? "None"
                  : `${propertyRules.length} added`
              }
            />
          </div>
        </aside>
      </div>
    </form>
  );
}
