"use client";

import {
  useActionState,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check } from "lucide-react";
import { createDeveloperEstateAction } from "@/actions/developer-estates.actions";
import { initialDeveloperEstateActionState } from "@/actions/developer-estates.state";
import { DeveloperMoneyInput } from "@/components/developer/developer-money-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LAND_UNIT_OPTIONS,
  calculateLandCapacity,
  formatSquareMetres,
  type LandSizeUnit,
} from "@/lib/developer/land-capacity";
import { formatNaira } from "@/lib/money/naira";
import { NIGERIA_STATES_LGAS } from "@/server/constants/nigeria-states-lgas";

const estateStatusOptions = [
  { value: "planning", label: "Planning" },
  { value: "selling", label: "Selling" },
  { value: "paused", label: "Paused" },
  { value: "sold_out", label: "Sold out" },
  { value: "archived", label: "Archived" },
] as const;

const numberingStyleOptions = [
  {
    value: "numeric",
    label: "Plot 1, Plot 2, Plot 3",
  },
  {
    value: "prefixed_numeric",
    label: "A1, A2, A3",
  },
  {
    value: "block_numeric",
    label: "Block A - Plot 1, Block A - Plot 2",
  },
] as const;

const wizardSteps = [
  {
    number: 1,
    label: "Estate details",
  },
  {
    number: 2,
    label: "Payment plan",
  },
  {
    number: 3,
    label: "Land and plots",
  },
  {
    number: 4,
    label: "Review",
  },
] as const;

const initialPaymentOptions = [
  "10",
  "20",
  "25",
  "30",
  "50",
  "100",
] as const;
const balanceMonthOptions = [
  "6",
  "12",
  "18",
  "24",
  "36",
  "48",
] as const;
const reservedLandOptions = [
  "0",
  "10",
  "15",
  "20",
  "25",
  "30",
] as const;

type WizardStep = (typeof wizardSteps)[number]["number"];
type InputMode = "decimal" | "numeric";

type PresetOrCustomControlProps = {
  id: string;
  label: string;
  description: string;
  value: string;
  options: readonly string[];
  suffix: string;
  customSelected: boolean;
  inputMode: InputMode;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
  onCustomSelectedChange: (selected: boolean) => void;
};

function cleanDecimalInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [firstPart, ...otherParts] = cleaned.split(".");

  return otherParts.length > 0
    ? `${firstPart}.${otherParts.join("")}`
    : firstPart;
}

function cleanIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function getNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getSafePercentage(value: string) {
  return Math.min(Math.max(getNumber(value), 0), 100);
}

function getNumberingStyleLabel(value: string) {
  return (
    numberingStyleOptions.find(
      (option) => option.value === value,
    )?.label ?? "Plot labels not selected"
  );
}

function getLandUnitLabel(value: LandSizeUnit) {
  return (
    LAND_UNIT_OPTIONS.find(
      (option) => option.value === value,
    )?.label ?? value
  );
}

function PresetOrCustomControl({
  id,
  label,
  description,
  value,
  options,
  suffix,
  customSelected,
  inputMode,
  disabled = false,
  error,
  onChange,
  onCustomSelectedChange,
}: PresetOrCustomControlProps) {
  function selectPreset(option: string) {
    onCustomSelectedChange(false);
    onChange(option);
  }

  function selectCustom() {
    onCustomSelectedChange(true);

    if (options.includes(value)) {
      onChange("");
    }
  }

  function cleanValue(nextValue: string) {
    return inputMode === "numeric"
      ? cleanIntegerInput(nextValue)
      : cleanDecimalInput(nextValue);
  }

  return (
    <div className="rounded-card border border-border-soft bg-white p-4">
      <p className="text-sm font-black text-text-strong">
        {label}
      </p>
      <p className="mt-1 text-xs font-bold leading-5 text-text-muted">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => {
          const active =
            !customSelected && value === option;

          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => selectPreset(option)}
              className={
                active
                  ? "min-h-10 rounded-button bg-primary px-4 text-sm font-black text-white shadow-soft"
                  : "min-h-10 rounded-button border border-border-soft bg-white px-4 text-sm font-black text-text-muted transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {option}
              {suffix}
            </button>
          );
        })}

        {customSelected ? (
          <div className="flex min-h-10 min-w-40 items-center rounded-button border border-primary bg-white px-3 ring-2 ring-primary-soft">
            <input
              id={id}
              type="text"
              inputMode={inputMode}
              value={disabled ? "0" : value}
              disabled={disabled}
              required={!disabled}
              autoFocus
              aria-label={`Custom ${label.toLowerCase()}`}
              onChange={(event) =>
                onChange(cleanValue(event.target.value))
              }
              className="min-w-0 flex-1 bg-transparent text-sm font-black text-text-strong outline-none disabled:cursor-not-allowed"
            />
            <span className="ml-2 shrink-0 text-xs font-black text-text-muted">
              {suffix}
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={selectCustom}
            className="min-h-10 rounded-button border border-border-soft bg-white px-4 text-sm font-black text-text-muted transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Custom
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DeveloperEstateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [currentStep, setCurrentStep] =
    useState<WizardStep>(1);
  const [clientError, setClientError] = useState("");

  const [estateName, setEstateName] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [selectedState, setSelectedState] =
    useState("");
  const [selectedLga, setSelectedLga] = useState("");
  const [estateStatus, setEstateStatus] =
    useState("planning");
  const [description, setDescription] = useState("");

  const [
    initialPaymentPercentage,
    setInitialPaymentPercentage,
  ] = useState("25");
  const [
    initialPaymentCustom,
    setInitialPaymentCustom,
  ] = useState(false);
  const [balanceSpreadMonths, setBalanceSpreadMonths] =
    useState("12");
  const [balanceMonthsCustom, setBalanceMonthsCustom] =
    useState(false);

  const [landSizeValue, setLandSizeValue] =
    useState("");
  const [landSizeUnit, setLandSizeUnit] =
    useState<LandSizeUnit>("hectare");
  const [
    reservedLandPercentage,
    setReservedLandPercentage,
  ] = useState("20");
  const [reservedLandCustom, setReservedLandCustom] =
    useState(false);
  const [plotSizeSqm, setPlotSizeSqm] =
    useState("500");
  const [numberOfPlots, setNumberOfPlots] =
    useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [numberingStyle, setNumberingStyle] =
    useState("numeric");
  const [startingNumber, setStartingNumber] =
    useState("1");
  const [labelPrefix, setLabelPrefix] = useState("");
  const [plotsPerBlock, setPlotsPerBlock] =
    useState("20");
  const [plotNote, setPlotNote] = useState("");

  const selectedStateData = NIGERIA_STATES_LGAS.find(
    (item) => item.state === selectedState,
  );

  const [state, formAction, isPending] = useActionState(
    createDeveloperEstateAction,
    initialDeveloperEstateActionState,
  );

  const safeInitialPaymentPercentage =
    getSafePercentage(initialPaymentPercentage);

  const effectiveBalanceSpreadMonths =
    safeInitialPaymentPercentage >= 100
      ? "0"
      : balanceSpreadMonths;

  const capacity = useMemo(
    () =>
      calculateLandCapacity({
        landSizeValue: getNumber(landSizeValue),
        landSizeUnit,
        reservedLandPercentage: getNumber(
          reservedLandPercentage,
        ),
        plotSizeSqm: getNumber(plotSizeSqm),
      }),
    [
      landSizeUnit,
      landSizeValue,
      plotSizeSqm,
      reservedLandPercentage,
    ],
  );

  const requestedPlots = getNumber(numberOfPlots);
  const hasCapacityInputs =
    getNumber(landSizeValue) > 0 &&
    getNumber(plotSizeSqm) > 0;
  const exceedsCapacity =
    requestedPlots > 0 &&
    capacity.maximumPlots > 0 &&
    requestedPlots > capacity.maximumPlots;

  const example = useMemo(() => {
    const plotPrice = 5_000_000;
    const firstPayment = Number(
      (
        (plotPrice * safeInitialPaymentPercentage) /
        100
      ).toFixed(2),
    );
    const balance = Math.max(
      0,
      plotPrice - firstPayment,
    );

    return {
      firstPayment,
      balance,
    };
  }, [safeInitialPaymentPercentage]);

  function reportFirstInvalidField(step: WizardStep) {
    const section = formRef.current?.querySelector(
      `[data-wizard-step="${step}"]`,
    );

    if (!section) {
      return true;
    }

    const controls = Array.from(
      section.querySelectorAll<
        HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
      >("input:not([type='hidden']), select, textarea"),
    );

    const invalidControl = controls.find(
      (control) =>
        !control.disabled && !control.checkValidity(),
    );

    if (!invalidControl) {
      return true;
    }

    invalidControl.reportValidity();
    invalidControl.focus();

    return false;
  }

  function validateCurrentStep() {
    setClientError("");

    if (!reportFirstInvalidField(currentStep)) {
      return false;
    }

    if (currentStep === 2) {
      if (
        safeInitialPaymentPercentage <= 0 ||
        safeInitialPaymentPercentage > 100
      ) {
        setClientError(
          "Enter a first payment percentage between 1% and 100%.",
        );
        return false;
      }

      if (
        safeInitialPaymentPercentage < 100 &&
        (
          getNumber(balanceSpreadMonths) < 1 ||
          getNumber(balanceSpreadMonths) > 120
        )
      ) {
        setClientError(
          "Enter a balance period between 1 and 120 months.",
        );
        return false;
      }
    }

    if (currentStep === 3) {
      const reservedPercentage = getNumber(
        reservedLandPercentage,
      );

      if (
        reservedPercentage < 0 ||
        reservedPercentage > 95
      ) {
        setClientError(
          "Reserved/common area must be between 0% and 95%.",
        );
        return false;
      }

      if (!hasCapacityInputs) {
        setClientError(
          "Enter the land size and plot size before continuing.",
        );
        return false;
      }

      if (requestedPlots < 1) {
        setClientError(
          "Enter the number of plots to generate.",
        );
        return false;
      }

      if (exceedsCapacity) {
        setClientError(
          `This land can carry a maximum of ${capacity.maximumPlots} ${capacity.maximumPlots === 1 ? "plot" : "plots"}.`,
        );
        return false;
      }

      if (!priceDisplay.trim()) {
        setClientError(
          "Enter the selling price per plot.",
        );
        return false;
      }
    }

    return true;
  }

  function moveToStep(step: WizardStep) {
    setCurrentStep(step);
    setClientError("");
    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function continueToNextStep() {
    if (!validateCurrentStep()) {
      return;
    }

    moveToStep(
      Math.min(4, currentStep + 1) as WizardStep,
    );
  }

  function goBack() {
    moveToStep(
      Math.max(1, currentStep - 1) as WizardStep,
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="scroll-mt-24"
    >
      <input
        type="hidden"
        name="initialPaymentPercentage"
        value={initialPaymentPercentage}
      />
      <input
        type="hidden"
        name="balanceSpreadMonths"
        value={effectiveBalanceSpreadMonths}
      />
      <input
        type="hidden"
        name="reservedLandPercentage"
        value={reservedLandPercentage}
      />

      <Card className="border border-border-soft bg-white p-0">
        <div className="border-b border-border-soft px-4 py-5 sm:px-6">
          <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {wizardSteps.map((step) => {
              const active =
                currentStep === step.number;
              const completed =
                currentStep > step.number;

              return (
                <li key={step.number}>
                  <div
                    aria-current={
                      active ? "step" : undefined
                    }
                    className={
                      active
                        ? "flex min-h-12 items-center gap-3 rounded-button bg-primary-soft px-4 text-primary"
                        : "flex min-h-12 items-center gap-3 rounded-button px-4 text-text-muted"
                    }
                  >
                    <span
                      className={
                        active
                          ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white"
                          : completed
                            ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-white"
                            : "flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-black text-text-muted ring-1 ring-border-soft"
                      }
                    >
                      {completed ? (
                        <Check
                          aria-hidden="true"
                          size={16}
                          strokeWidth={3}
                        />
                      ) : (
                        step.number
                      )}
                    </span>

                    <span className="text-sm font-black">
                      {step.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <CardContent className="space-y-6 p-4 sm:p-6">
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
            </div>
          ) : null}

          {clientError ? (
            <div
              role="alert"
              className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {clientError}
            </div>
          ) : null}

          <section
            data-wizard-step="1"
            hidden={currentStep !== 1}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-black tracking-tight text-text-strong">
                Estate details
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Enter the estate identity, location, and current development status.
              </p>
            </div>

            <Input
              label="Estate name"
              name="estateName"
              value={estateName}
              onChange={(event) =>
                setEstateName(event.target.value)
              }
              placeholder="Greenfield Estate"
              error={
                state.fieldErrors?.estateName?.[0]
              }
              required
            />

            <Input
              label="Estate address / location"
              name="location"
              value={location}
              onChange={(event) =>
                setLocation(event.target.value)
              }
              placeholder="Estate road, nearest landmark, area"
              error={state.fieldErrors?.location?.[0]}
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="City / town"
                name="city"
                value={city}
                onChange={(event) =>
                  setCity(event.target.value)
                }
                placeholder="Lekki"
                error={state.fieldErrors?.city?.[0]}
              />

              <div className="space-y-2">
                <label
                  htmlFor="status"
                  className="block text-sm font-semibold text-text-strong"
                >
                  Development status
                  <span className="ml-1 text-danger">
                    *
                  </span>
                </label>

                <select
                  id="status"
                  name="status"
                  required
                  value={estateStatus}
                  onChange={(event) =>
                    setEstateStatus(
                      event.target.value,
                    )
                  }
                  className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                >
                  {estateStatusOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                {state.fieldErrors?.status?.[0] ? (
                  <p className="text-sm font-medium text-danger">
                    {state.fieldErrors.status[0]}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="state"
                  className="block text-sm font-semibold text-text-strong"
                >
                  State / FCT
                  <span className="ml-1 text-danger">
                    *
                  </span>
                </label>

                <select
                  id="state"
                  name="state"
                  required
                  value={selectedState}
                  onChange={(event) => {
                    setSelectedState(
                      event.target.value,
                    );
                    setSelectedLga("");
                  }}
                  className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                >
                  <option value="">
                    Select state
                  </option>
                  {NIGERIA_STATES_LGAS.map((item) => (
                    <option
                      key={item.state}
                      value={item.state}
                    >
                      {item.state}
                    </option>
                  ))}
                </select>

                {state.fieldErrors?.state?.[0] ? (
                  <p className="text-sm font-medium text-danger">
                    {state.fieldErrors.state[0]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lga"
                  className="block text-sm font-semibold text-text-strong"
                >
                  LGA
                  <span className="ml-1 text-danger">
                    *
                  </span>
                </label>

                <select
                  id="lga"
                  name="lga"
                  required
                  disabled={!selectedStateData}
                  value={selectedLga}
                  onChange={(event) =>
                    setSelectedLga(
                      event.target.value,
                    )
                  }
                  className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted"
                >
                  <option value="">
                    {selectedStateData
                      ? "Select LGA"
                      : "Select state first"}
                  </option>
                  {selectedStateData?.lgas.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>

                {state.fieldErrors?.lga?.[0] ? (
                  <p className="text-sm font-medium text-danger">
                    {state.fieldErrors.lga[0]}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-text-strong"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={4}
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Optional estate description"
                className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />

              {state.fieldErrors?.description?.[0] ? (
                <p className="text-sm font-medium text-danger">
                  {state.fieldErrors.description[0]}
                </p>
              ) : null}
            </div>
          </section>

          <section
            data-wizard-step="2"
            hidden={currentStep !== 2}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-black tracking-tight text-text-strong">
                Payment plan
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Set the default first payment and balance period for buyer purchase links.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <PresetOrCustomControl
                id="customInitialPaymentPercentage"
                label="First payment"
                description="Percentage of the plot price buyers must pay first."
                value={initialPaymentPercentage}
                options={initialPaymentOptions}
                suffix="%"
                inputMode="decimal"
                customSelected={initialPaymentCustom}
                error={
                  state.fieldErrors
                    ?.initialPaymentPercentage?.[0]
                }
                onChange={
                  setInitialPaymentPercentage
                }
                onCustomSelectedChange={
                  setInitialPaymentCustom
                }
              />

              <PresetOrCustomControl
                id="customBalanceSpreadMonths"
                label="Balance period"
                description="How long buyers have to complete the remaining balance."
                value={
                  safeInitialPaymentPercentage >= 100
                    ? "0"
                    : balanceSpreadMonths
                }
                options={balanceMonthOptions}
                suffix=" months"
                inputMode="numeric"
                disabled={
                  safeInitialPaymentPercentage >= 100
                }
                customSelected={balanceMonthsCustom}
                error={
                  state.fieldErrors
                    ?.balanceSpreadMonths?.[0]
                }
                onChange={setBalanceSpreadMonths}
                onCustomSelectedChange={
                  setBalanceMonthsCustom
                }
              />
            </div>

            <div className="rounded-button bg-primary-soft px-4 py-3 text-sm font-bold leading-6 text-text-strong">
              If one plot costs ₦5,000,000, the first
              payment will be{" "}
              {formatNaira(example.firstPayment)}
              {safeInitialPaymentPercentage >= 100
                ? ". No balance remains."
                : ` and the remaining ${formatNaira(
                    example.balance,
                  )} is due over ${balanceSpreadMonths || "0"} months.`}
            </div>
          </section>

          <section
            data-wizard-step="3"
            hidden={currentStep !== 3}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-black tracking-tight text-text-strong">
                Land and plots
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Confirm the land capacity, plot inventory, price, and label format.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="landSizeValue"
                  className="block text-sm font-semibold text-text-strong"
                >
                  Total land size
                  <span className="ml-1 text-danger">
                    *
                  </span>
                </label>

                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                  <input
                    id="landSizeValue"
                    name="landSizeValue"
                    type="text"
                    inputMode="decimal"
                    value={landSizeValue}
                    onChange={(event) =>
                      setLandSizeValue(
                        cleanDecimalInput(
                          event.target.value,
                        ),
                      )
                    }
                    placeholder="Example: 1"
                    required
                    className="min-h-12 rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
                  />

                  <select
                    name="landSizeUnit"
                    value={landSizeUnit}
                    onChange={(event) =>
                      setLandSizeUnit(
                        event.target
                          .value as LandSizeUnit,
                      )
                    }
                    className="min-h-12 rounded-button border border-border-soft bg-white px-4 py-3 text-base font-bold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                  >
                    {LAND_UNIT_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {state.fieldErrors?.landSizeValue?.[0] ? (
                  <p className="text-sm font-medium text-danger">
                    {
                      state.fieldErrors
                        .landSizeValue[0]
                    }
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="plotSizeSqm"
                  className="block text-sm font-semibold text-text-strong"
                >
                  Size of each plot
                  <span className="ml-1 text-danger">
                    *
                  </span>
                </label>

                <div className="flex min-h-12 items-center rounded-button border border-border-soft bg-white px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-soft">
                  <input
                    id="plotSizeSqm"
                    name="plotSizeSqm"
                    type="text"
                    inputMode="decimal"
                    value={plotSizeSqm}
                    onChange={(event) =>
                      setPlotSizeSqm(
                        cleanDecimalInput(
                          event.target.value,
                        ),
                      )
                    }
                    placeholder="Example: 500"
                    required
                    className="w-full bg-transparent text-base text-text-strong outline-none placeholder:text-text-muted"
                  />
                  <span className="text-sm font-black text-text-muted">
                    sqm
                  </span>
                </div>

                {state.fieldErrors?.plotSizeSqm?.[0] ? (
                  <p className="text-sm font-medium text-danger">
                    {
                      state.fieldErrors.plotSizeSqm[0]
                    }
                  </p>
                ) : null}
              </div>
            </div>

            <PresetOrCustomControl
              id="reservedLandPercentage"
              label="Reserved/common area"
              description="Roads, drainage, setbacks, green areas, and shared spaces."
              value={reservedLandPercentage}
              options={reservedLandOptions}
              suffix="%"
              inputMode="decimal"
              customSelected={reservedLandCustom}
              error={
                state.fieldErrors
                  ?.reservedLandPercentage?.[0]
              }
              onChange={setReservedLandPercentage}
              onCustomSelectedChange={
                setReservedLandCustom
              }
            />

            <div className="rounded-card border border-border-soft bg-white p-4">
              <p className="text-sm font-black text-text-strong">
                BOPA land capacity check
              </p>

              {hasCapacityInputs ? (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-button bg-background p-3">
                      <p className="text-xs font-bold text-text-muted">
                        Gross land
                      </p>
                      <p className="mt-1 font-black text-text-strong">
                        {formatSquareMetres(
                          capacity.grossLandSizeSqm,
                        )}{" "}
                        sqm
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-3">
                      <p className="text-xs font-bold text-text-muted">
                        Usable land
                      </p>
                      <p className="mt-1 font-black text-text-strong">
                        {formatSquareMetres(
                          capacity.usableLandSizeSqm,
                        )}{" "}
                        sqm
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-3">
                      <p className="text-xs font-bold text-text-muted">
                        Max plots
                      </p>
                      <p className="mt-1 font-black text-text-strong">
                        {capacity.maximumPlots}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-3">
                      <p className="text-xs font-bold text-text-muted">
                        Requested
                      </p>
                      <p
                        className={
                          exceedsCapacity
                            ? "mt-1 font-black text-danger"
                            : "mt-1 font-black text-text-strong"
                        }
                      >
                        {requestedPlots > 0
                          ? requestedPlots
                          : "Not entered"}
                      </p>
                    </div>
                  </div>

                  {exceedsCapacity ? (
                    <div className="mt-4 rounded-button bg-danger-soft px-4 py-3 text-sm font-bold leading-6 text-danger">
                      Reduce the number of plots,
                      increase the land size, or reduce
                      the reserved/common area.
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-4 rounded-button bg-background px-4 py-5 text-sm font-semibold leading-6 text-text-muted">
                  Enter land size and plot size above to
                  see the maximum number of plots.
                </div>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Number of plots to generate"
                name="numberOfPlots"
                type="number"
                min="1"
                max="500"
                step="1"
                value={numberOfPlots}
                onChange={(event) =>
                  setNumberOfPlots(
                    event.target.value,
                  )
                }
                placeholder="Example: 16"
                error={
                  state.fieldErrors
                    ?.numberOfPlots?.[0]
                }
                required
              />

              <DeveloperMoneyInput
                label="Selling price per plot"
                value={priceDisplay}
                onChange={setPriceDisplay}
                hiddenInputName="pricePerPlot"
                required
                error={
                  state.fieldErrors
                    ?.pricePerPlot?.[0]
                }
              />

              <div className="space-y-2">
                <label
                  htmlFor="numberingStyle"
                  className="block text-sm font-semibold text-text-strong"
                >
                  Plot label style
                  <span className="ml-1 text-danger">
                    *
                  </span>
                </label>

                <select
                  id="numberingStyle"
                  name="numberingStyle"
                  required
                  value={numberingStyle}
                  onChange={(event) =>
                    setNumberingStyle(
                      event.target.value,
                    )
                  }
                  className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                >
                  {numberingStyleOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>

                {state.fieldErrors?.numberingStyle?.[0] ? (
                  <p className="text-sm font-medium text-danger">
                    {
                      state.fieldErrors
                        .numberingStyle[0]
                    }
                  </p>
                ) : null}
              </div>

              <Input
                label="Starting number"
                name="startingNumber"
                type="number"
                min="1"
                step="1"
                value={startingNumber}
                onChange={(event) =>
                  setStartingNumber(
                    event.target.value,
                  )
                }
                error={
                  state.fieldErrors
                    ?.startingNumber?.[0]
                }
                required
              />

              <Input
                label="Prefix, if needed"
                name="labelPrefix"
                value={labelPrefix}
                onChange={(event) =>
                  setLabelPrefix(
                    event.target.value,
                  )
                }
                placeholder="Example: A"
                error={
                  state.fieldErrors?.labelPrefix?.[0]
                }
              />

              <Input
                label="Plots per block"
                name="plotsPerBlock"
                type="number"
                min="1"
                max="100"
                step="1"
                value={plotsPerBlock}
                onChange={(event) =>
                  setPlotsPerBlock(
                    event.target.value,
                  )
                }
                error={
                  state.fieldErrors
                    ?.plotsPerBlock?.[0]
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="plotNote"
                className="block text-sm font-semibold text-text-strong"
              >
                Plot note
              </label>

              <textarea
                id="plotNote"
                name="plotNote"
                rows={3}
                value={plotNote}
                onChange={(event) =>
                  setPlotNote(event.target.value)
                }
                placeholder="Optional"
                className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />

              {state.fieldErrors?.plotNote?.[0] ? (
                <p className="text-sm font-medium text-danger">
                  {state.fieldErrors.plotNote[0]}
                </p>
              ) : null}
            </div>
          </section>

          <section
            data-wizard-step="4"
            hidden={currentStep !== 4}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-black tracking-tight text-text-strong">
                Review
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Confirm the estate and plot inventory before creating the records.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-card border border-border-soft bg-background p-5">
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Estate
                </p>
                <p className="mt-2 text-lg font-black text-text-strong">
                  {estateName || "Estate name not entered"}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  {[
                    location,
                    city,
                    selectedLga,
                    selectedState,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    "Location not completed"}
                </p>
                <p className="mt-3 text-sm font-bold text-text-strong">
                  Status:{" "}
                  {estateStatusOptions.find(
                    (option) =>
                      option.value === estateStatus,
                  )?.label ?? estateStatus}
                </p>
              </div>

              <div className="rounded-card border border-border-soft bg-background p-5">
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Payment plan
                </p>
                <p className="mt-2 text-lg font-black text-text-strong">
                  {initialPaymentPercentage || "0"}%
                  first payment
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  {safeInitialPaymentPercentage >= 100
                    ? "Outright payment with no balance period."
                    : `Remaining balance over ${balanceSpreadMonths || "0"} months.`}
                </p>
              </div>

              <div className="rounded-card border border-border-soft bg-background p-5">
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Land
                </p>
                <p className="mt-2 text-lg font-black text-text-strong">
                  {landSizeValue || "0"}{" "}
                  {getLandUnitLabel(landSizeUnit)}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  {plotSizeSqm || "0"} sqm per plot ·{" "}
                  {reservedLandPercentage || "0"}%
                  reserved/common area
                </p>
              </div>

              <div className="rounded-card border border-border-soft bg-background p-5">
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Plot inventory
                </p>
                <p className="mt-2 text-lg font-black text-text-strong">
                  {numberOfPlots || "0"} plots at{" "}
                  {priceDisplay || "price not entered"}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  {getNumberingStyleLabel(
                    numberingStyle,
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-button bg-warning-soft px-4 py-3 text-sm font-bold leading-6 text-text-strong">
              Creating the estate will immediately generate
              the plot inventory shown above.
            </div>
          </section>
        </CardContent>

        <CardFooter className="px-4 pb-5 sm:px-6">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={goBack}
              disabled={isPending}
            >
              Back
            </Button>
          ) : null}

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={continueToNextStep}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              isLoading={isPending}
              disabled={exceedsCapacity}
            >
              Create estate and generate plots
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
