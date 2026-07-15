"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createManagerPropertyAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import type { ManagerManagementFeeType } from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import {
  getNigeriaLgaOptions,
  getNigeriaStateOptions,
} from "@/lib/nigeria-state-lga";
import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerPropertyFormProps = {
  landlordClients: ManagerLandlordClientRow[];
};

type OwnerMode = "existing" | "new";
type FormStep = "details" | "rent";

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
  const [state, formAction, isPending] = useActionState(
    createManagerPropertyAction,
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

  return (
    <form action={formAction}>
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
      <input type="hidden" name="notes" value={notes} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-card border border-border-soft bg-white shadow-sm">
          <div className="border-b border-border-soft p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StepButton
                active={step === "details"}
                label="1. Property details"
                description="Landlord, address, and location."
              />
              <StepButton
                active={step === "rent"}
                label="2. Rent setup"
                description="Manager collection and management fee."
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
                          />

                          <Input
                            id="newLandlordAddressVisible"
                            label="Landlord address"
                            value={newLandlordAddress}
                            onChange={(event) =>
                              setNewLandlordAddress(event.target.value)
                            }
                            placeholder="Optional"
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
                    required
                  />

                  <Input
                    id="propertyAddressVisible"
                    label="Property address"
                    value={propertyAddress}
                    onChange={(event) => setPropertyAddress(event.target.value)}
                    placeholder="Example: 12 Admiralty Way"
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
                    />
                  </div>
                </section>

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
            ) : (
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

                  <Button type="submit" isLoading={isPending}>
                    Save property
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
          </div>
        </aside>
      </div>
    </form>
  );
}
