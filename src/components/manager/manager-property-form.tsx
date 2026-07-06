"use client";

import { useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { createManagerPropertyAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_PAYSTACK_CHARGE_BEARERS,
  type ManagerCollectionMode,
  type ManagerManagementFeeType,
  type ManagerPaystackChargeBearer,
  type ManagerPaymentReceiver,
} from "@/constants/manager";
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

const COLLECTION_MODE_OPTIONS: Array<{
  value: ManagerCollectionMode;
  title: string;
  description: string;
}> = [
  {
    value: "manager_collects",
    title: "Manager collects",
    description: "Tenant pays the manager. Manager remits landlord balance.",
  },
  {
    value: "landlord_direct",
    title: "Landlord receives directly",
    description: "Tenant pays landlord. Manager records and tracks the rent.",
  },
  {
    value: "automatic_split",
    title: "BOPA automatic split",
    description: "Tenant pays once. BOPA shares the money automatically.",
  },
];

const CHARGE_BEARER_LABELS: Record<ManagerPaystackChargeBearer, string> = {
  tenant: "Tenant",
  landlord: "Landlord",
  manager: "Manager",
  bopa: "BOPA",
};

function getPaymentReceiver(
  collectionMode: ManagerCollectionMode,
): ManagerPaymentReceiver {
  if (collectionMode === "manager_collects") {
    return "manager";
  }

  if (collectionMode === "landlord_direct") {
    return "landlord";
  }

  return "bopa_verified";
}

function getCollectionLabel(collectionMode: ManagerCollectionMode) {
  return (
    COLLECTION_MODE_OPTIONS.find((option) => option.value === collectionMode)
      ?.title ?? "Not selected"
  );
}

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

  const lgaOptions = useMemo(
    () => getNigeriaLgaOptions(stateName),
    [stateName],
  );

  const [collectionMode, setCollectionMode] =
    useState<ManagerCollectionMode>("manager_collects");

  const [hasManagementFee, setHasManagementFee] = useState(true);
  const [feeType, setFeeType] =
    useState<ManagerManagementFeeType>("percentage");
  const [managementFeeValue, setManagementFeeValue] = useState("10");
  const [paystackChargeBearer, setPaystackChargeBearer] =
    useState<ManagerPaystackChargeBearer>("tenant");
  const [notes, setNotes] = useState("");

  const useExistingLandlord =
    ownerMode === "existing" && landlordClients.length > 0;

  const selectedLandlord = useMemo(
    () =>
      landlordClients.find((client) => client.id === selectedLandlordId) ??
      null,
    [landlordClients, selectedLandlordId],
  );

  const paymentReceiver = getPaymentReceiver(collectionMode);
  const shouldShowPaystackCharges = collectionMode === "automatic_split";

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

      <input type="hidden" name="collectionMode" value={collectionMode} />
      <input type="hidden" name="paymentReceiver" value={paymentReceiver} />
      <input
        type="hidden"
        name="paystackChargeBearer"
        value={paystackChargeBearer}
      />
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
                description="Collection method and management fee."
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
                      href="/manager/properties"
                      prefetch={false}
                      className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                    >
                      View properties
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
                      {state.fieldErrors?.landlordClientId?.[0] ? (
                        <p className="text-sm font-semibold text-danger">
                          {state.fieldErrors.landlordClientId[0]}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Landlord name"
                        name="newLandlordNameVisible"
                        placeholder="Example: Mrs Ada Chukwu"
                        value={newLandlordName}
                        onChange={(event) =>
                          setNewLandlordName(event.target.value)
                        }
                        error={state.fieldErrors?.landlordName?.[0]}
                        required
                      />

                      <Input
                        label="Landlord phone"
                        name="newLandlordPhoneVisible"
                        placeholder="Example: 08012345678"
                        value={newLandlordPhone}
                        onChange={(event) =>
                          setNewLandlordPhone(event.target.value)
                        }
                        error={state.fieldErrors?.landlordPhone?.[0]}
                        required
                      />

                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={() =>
                            setShowMoreLandlordDetails((current) => !current)
                          }
                          className="text-sm font-black text-primary"
                        >
                          {showMoreLandlordDetails
                            ? "Hide extra landlord details"
                            : "+ add email or address"}
                        </button>
                      </div>

                      {showMoreLandlordDetails ? (
                        <>
                          <Input
                            label="Landlord email"
                            name="newLandlordEmailVisible"
                            type="email"
                            placeholder="Optional"
                            value={newLandlordEmail}
                            onChange={(event) =>
                              setNewLandlordEmail(event.target.value)
                            }
                            error={state.fieldErrors?.landlordEmail?.[0]}
                          />

                          <Input
                            label="Landlord address"
                            name="newLandlordAddressVisible"
                            placeholder="Optional"
                            value={newLandlordAddress}
                            onChange={(event) =>
                              setNewLandlordAddress(event.target.value)
                            }
                            error={state.fieldErrors?.landlordAddress?.[0]}
                          />
                        </>
                      ) : null}
                    </div>
                  )}
                </section>

                <section className="border-t border-border-soft pt-5">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Property details
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      This is what will appear on unit records, receipts, and
                      statements.
                    </p>
                  </div>

                  <div className="mt-4 space-y-4">
                    <Input
                      label="Property name"
                      name="propertyNameVisible"
                      placeholder="Example: Asuquo House"
                      value={propertyName}
                      onChange={(event) => setPropertyName(event.target.value)}
                      error={state.fieldErrors?.propertyName?.[0]}
                      required
                    />

                    <Input
                      label="Property address"
                      name="propertyAddressVisible"
                      placeholder="Example: 12 Fatai Atere Way"
                      value={propertyAddress}
                      onChange={(event) =>
                        setPropertyAddress(event.target.value)
                      }
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
                        {state.fieldErrors?.state?.[0] ? (
                          <p className="text-sm font-semibold text-danger">
                            {state.fieldErrors.state[0]}
                          </p>
                        ) : null}
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
                          disabled={!stateName}
                          className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted"
                          required
                        >
                          <option value="">
                            {stateName ? "Select LGA" : "Select state first"}
                          </option>
                          {lgaOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {state.fieldErrors?.lga?.[0] ? (
                          <p className="text-sm font-semibold text-danger">
                            {state.fieldErrors.lga[0]}
                          </p>
                        ) : null}
                      </div>

                      <Input
                        label="City/Area"
                        name="cityVisible"
                        placeholder="Lekki"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        error={state.fieldErrors?.city?.[0]}
                      />
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Rent collection
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      Choose how rent is actually received for this property.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {COLLECTION_MODE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCollectionMode(option.value)}
                        className={`rounded-card border p-4 text-left transition ${
                          collectionMode === option.value
                            ? "border-primary bg-primary-soft"
                            : "border-border-soft bg-white hover:border-primary/40"
                        }`}
                      >
                        <p className="font-black text-text-strong">
                          {option.title}
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  {state.fieldErrors?.collectionMode?.[0] ? (
                    <p className="text-sm font-semibold text-danger">
                      {state.fieldErrors.collectionMode[0]}
                    </p>
                  ) : null}
                </section>

                <section className="border-t border-border-soft pt-5">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-strong">
                      Management fee
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      BOPA uses this to calculate manager share and landlord
                      balance automatically.
                    </p>
                  </div>

                  <div className="mt-4 inline-flex rounded-button border border-border-soft bg-surface p-1">
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
                    <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
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
                          <option value="flat">Fixed amount</option>
                        </select>
                      </div>

                      {feeType === "flat" ? (
                        <CurrencyInput
                          label="Fee amount"
                          name="managementFeeValueVisible"
                          value={managementFeeValue}
                          onValueChange={setManagementFeeValue}
                          placeholder="0.00"
                          error={state.fieldErrors?.managementFeeValue?.[0]}
                          required
                        />
                      ) : (
                        <Input
                          label="Fee percentage"
                          name="managementFeeValueVisible"
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
                      )}
                    </div>
                  ) : null}
                </section>

                {shouldShowPaystackCharges ? (
                  <section className="border-t border-border-soft pt-5">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-text-strong">
                        Online payment charge
                      </h2>
                      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                        Choose who bears Paystack charges when BOPA splits rent.
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {MANAGER_PAYSTACK_CHARGE_BEARERS.map((bearer) => (
                        <button
                          key={bearer}
                          type="button"
                          onClick={() => setPaystackChargeBearer(bearer)}
                          className={`min-h-11 rounded-button border px-4 text-sm font-black transition ${
                            paystackChargeBearer === bearer
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-border-soft bg-white text-text-strong hover:border-primary/40"
                          }`}
                        >
                          {CHARGE_BEARER_LABELS[bearer]}
                        </button>
                      ))}
                    </div>

                    {state.fieldErrors?.paystackChargeBearer?.[0] ? (
                      <p className="mt-2 text-sm font-semibold text-danger">
                        {state.fieldErrors.paystackChargeBearer[0]}
                      </p>
                    ) : null}
                  </section>
                ) : null}

                <section className="border-t border-border-soft pt-5">
                  <button
                    type="button"
                    onClick={() => setShowNote((current) => !current)}
                    className="text-sm font-black text-primary"
                  >
                    {showNote ? "Hide note" : "+ add internal note"}
                  </button>

                  {showNote ? (
                    <div className="mt-3 space-y-2">
                      <label
                        htmlFor="manager-property-notes"
                        className="text-sm font-bold text-text-strong"
                      >
                        Internal note
                      </label>
                      <textarea
                        id="manager-property-notes"
                        rows={3}
                        placeholder="Optional"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                      />
                      {state.fieldErrors?.notes?.[0] ? (
                        <p className="text-sm font-semibold text-danger">
                          {state.fieldErrors.notes[0]}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              </>
            )}
          </div>

          <div className="border-t border-border-soft p-4">
            {step === "details" ? (
              <Button
                type="button"
                disabled={!canContinueFromDetails}
                fullWidth
                onClick={() => setStep("rent")}
              >
                Continue
              </Button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => setStep("details")}
                >
                  Back
                </Button>

                <Button type="submit" isLoading={isPending} fullWidth>
                  Save property
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Property summary
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Check the setup before saving.
            </p>

            <div className="mt-4">
              <SummaryItem label="Landlord" value={landlordSummary} />
              <SummaryItem
                label="Property"
                value={propertyName.trim() || "Property name"}
              />
              <SummaryItem
                label="Address"
                value={propertyAddress.trim() || "Property address"}
              />
              <SummaryItem
                label="Location"
                value={locationSummary || "Not set"}
              />
              <SummaryItem
                label="Collection"
                value={getCollectionLabel(collectionMode)}
              />
              <SummaryItem
                label="Management fee"
                value={managementFeeSummary}
              />
              <SummaryItem
                label="Paystack charge"
                value={CHARGE_BEARER_LABELS[paystackChargeBearer]}
              />
            </div>
          </section>

          <section className="rounded-card border border-primary/20 bg-primary-soft p-4">
            <p className="text-sm font-black text-text-strong">
              What happens next
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              After saving, open this property to add units, then add tenants to
              each vacant unit.
            </p>
          </section>
        </aside>
      </div>
    </form>
  );
}
