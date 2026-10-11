"use client";

import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { Check } from "lucide-react";
import { generatePublicReceiptAction } from "@/actions/public-receipt-generator.actions";
import { initialPublicReceiptGeneratorState } from "@/actions/public-receipt-generator.state";
import { GeneratedReceiptResult } from "@/components/public-tools/generated-receipt-result";
import { FreeToolAccountPrompt } from "@/components/public-tools/free-tool-account-prompt";
import { PublicDocumentPaymentButton } from "@/components/public-tools/public-document-payment-button";
import {
  ReceiptStampField,
  SignaturePadField,
} from "@/components/public-tools/signature-pad-field";
import { Button } from "@/components/ui/button";
import {
  addDaysToDateOnly,
  calculateAnchoredRentCycleDate,
} from "@/lib/rent-cycle";

type ReceiptGeneratorFormProps = {
  sourcePath: string;
  sourceLocation?: string;
};

function calculateEndDate(startDate: string, duration: string) {
  if (!startDate) {
    return "";
  }

  const monthsByDuration: Record<string, number> = {
    "6_months": 6,
    "1_year": 12,
    "2_years": 24,
  };

  const months = monthsByDuration[duration] ?? 12;

  try {
    const nextPeriodStart = calculateAnchoredRentCycleDate({
      anchorDate: startDate,
      paymentFrequency: "monthly",
      cycleIndex: months,
    });

    return addDaysToDateOnly(nextPeriodStart, -1);
  } catch {
    return "";
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-semibold text-danger">{message}</p>;
}

function fieldClassName(hasError: boolean) {
  return [
    "min-h-13 w-full rounded-[10px] border-[1.5px] bg-white px-4 py-3 text-base text-text-strong outline-none transition",
    hasError
      ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger-soft"
      : "border-border-soft focus:border-primary focus:ring-2 focus:ring-primary-soft",
  ].join(" ");
}

function SectionHeading({ number, children }: { number: number; children: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-extrabold text-white">
        {number}
      </span>
      <h2 className="text-xl font-extrabold text-text-strong md:text-[22px]">
        {children}
      </h2>
    </div>
  );
}

export function ReceiptGeneratorForm({
  sourcePath,
  sourceLocation,
}: ReceiptGeneratorFormProps) {
  const [state, formAction, isPending] = useActionState(
    generatePublicReceiptAction,
    initialPublicReceiptGeneratorState,
  );
  const [rentStartDate, setRentStartDate] = useState("");
  const [rentDuration, setRentDuration] = useState("1_year");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [landlordFullName, setLandlordFullName] = useState("");
  const [landlordPhoneNumber, setLandlordPhoneNumber] = useState("");
  const [tenantFullName, setTenantFullName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [totalRentDue, setTotalRentDue] = useState("");
  const [rentAmountPaid, setRentAmountPaid] = useState("");
  const [receiptTier, setReceiptTier] = useState<"free" | "paid">("free");
  const [paidCreditSummary, setPaidCreditSummary] = useState<{
    identityKey: string;
    paidRemaining: number;
  } | null>(null);
  const [dismissedProIdentity, setDismissedProIdentity] = useState<string | null>(
    null,
  );
  const [signatureResetKey, setSignatureResetKey] = useState(0);
  const [showLandlordEmail, setShowLandlordEmail] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lastResetReceiptIdRef = useRef<string | null>(null);

  const calculatedEndDate = useMemo(
    () => calculateEndDate(rentStartDate, rentDuration),
    [rentStartDate, rentDuration],
  );
  const calculatedBalance = useMemo(() => {
    const total = Number(totalRentDue.replace(/,/g, ""));
    const paid = Number(rentAmountPaid.replace(/,/g, ""));
    if (!Number.isFinite(total) || !Number.isFinite(paid)) return null;
    return Math.max(0, total - paid);
  }, [rentAmountPaid, totalRentDue]);
  const currentIdentityKey = useMemo(
    () =>
      [
        landlordFullName.trim().toLocaleLowerCase(),
        landlordPhoneNumber.replace(/\D/g, "").slice(-10),
      ].join("|"),
    [landlordFullName, landlordPhoneNumber],
  );

  useEffect(() => {
    const phone = landlordPhoneNumber.replace(/\D/g, "");

    if (
      landlordFullName.trim().length < 2 ||
      phone.length < 10
    ) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/public-tools/payment/initialize", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            landlordFullName,
            landlordPhoneNumber,
            propertyAddress,
          }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = (await response.json()) as { paidRemaining?: number };
        setPaidCreditSummary({
          identityKey: currentIdentityKey,
          paidRemaining: Number(result.paidRemaining ?? 0),
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Receipt credit lookup failed:", error);
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    currentIdentityKey,
    landlordFullName,
    landlordPhoneNumber,
    propertyAddress,
  ]);

  useEffect(() => {
    const receiptId = state.ok ? state.receipt?.receiptId : undefined;

    if (!receiptId || lastResetReceiptIdRef.current === receiptId) {
      return;
    }

    lastResetReceiptIdRef.current = receiptId;
    formRef.current?.reset();
    setLandlordFullName("");
    setLandlordPhoneNumber("");
    setTenantFullName("");
    setPropertyAddress("");
    setTotalRentDue("");
    setRentAmountPaid("");
    setRentStartDate("");
    setRentDuration("1_year");
    setPaymentMethod("bank_transfer");
    setReceiptTier("free");
    setPaidCreditSummary(null);
    setDismissedProIdentity(null);
    setSignatureResetKey((current) => current + 1);
    setShowLandlordEmail(false);
  }, [state.ok, state.receipt?.receiptId]);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <form
        ref={formRef}
        id="public-receipt-generator-form"
        action={formAction}
        className="space-y-5"
      >
        <input type="hidden" name="sourcePath" value={sourcePath} />
        <input type="hidden" name="receiptTier" value={receiptTier} />
        <input
          type="hidden"
          name="sourceLocation"
          value={sourceLocation ?? ""}
        />

        <section className="rounded-card border border-border-soft bg-surface p-5 md:p-7">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight text-text-strong">
              Choose your receipt
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Start with three free receipts, or buy 24 Pro receipts now for
              branded records without the free-tool disclaimer.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div
              className={`rounded-card border-2 p-5 ${
                receiptTier === "free"
                  ? "border-primary bg-primary-soft/40"
                  : "border-border-soft bg-white"
              }`}
            >
              <p className="text-xs font-extrabold uppercase tracking-wide text-text-muted">
                Free
              </p>
              <h3 className="mt-2 text-xl font-black text-text-strong">
                Free receipt
              </h3>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-text-normal">
                <li>✓ Three successful receipts</li>
                <li>✓ Draw signatures on screen</li>
                <li>✓ Download and share the PDF</li>
                <li>✓ Small BOPA disclaimer</li>
              </ul>
              <button
                type="button"
                onClick={() => setReceiptTier("free")}
                className="mt-5 min-h-12 w-full rounded-button border-2 border-primary bg-white px-4 font-extrabold text-primary"
              >
                Make a free receipt
              </button>
            </div>

            <div
              className={`rounded-card border-2 p-5 ${
                receiptTier === "paid"
                  ? "border-primary bg-primary-soft/40"
                  : "border-primary bg-white"
              }`}
            >
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
                Receipts Pro
              </p>
              <h3 className="mt-2 text-xl font-black text-text-strong">
                24 Pro receipts
              </h3>
              <p className="mt-1 text-2xl font-black text-text-strong">₦2,500</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-text-normal">
                <li>✓ Everything in Free</li>
                <li>✓ Pro receipt design and PAID stamp</li>
                <li>✓ No free-tool disclaimer</li>
                <li>✓ Use paid credits before free credits</li>
              </ul>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setReceiptTier("paid")}
                  className="min-h-12 w-full rounded-button border-2 border-primary bg-white px-4 font-extrabold text-primary transition hover:bg-primary-soft"
                >
                  Use my Pro credits
                </button>
                <PublicDocumentPaymentButton
                  product="receipt"
                  formId="public-receipt-generator-form"
                  label="Buy 24 Pro receipts"
                  onOpen={() => setReceiptTier("paid")}
                  onPaymentVerified={() => setReceiptTier("paid")}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-card border border-border-soft bg-surface p-5 md:p-7">
          <SectionHeading number={1}>Landlord</SectionHeading>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Landlord&apos;s full name
              </label>
              <input
                name="landlordFullName"
                value={landlordFullName}
                onChange={(event) => setLandlordFullName(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.landlordFullName?.[0]),
                )}
                placeholder="e.g. Mr Chinedu Okafor"
              />
              <FieldError message={state.fieldErrors?.landlordFullName?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Landlord&apos;s phone number
              </label>
              <input
                name="landlordPhoneNumber"
                value={landlordPhoneNumber}
                onChange={(event) => setLandlordPhoneNumber(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.landlordPhoneNumber?.[0]),
                )}
                placeholder="e.g. 08012345678"
              />
              <FieldError
                message={state.fieldErrors?.landlordPhoneNumber?.[0]}
              />
              <p className="mt-2 text-sm text-text-muted">
                11 digits, like 08012345678
              </p>
            </div>

            {paidCreditSummary &&
            paidCreditSummary.identityKey === currentIdentityKey &&
            paidCreditSummary.paidRemaining > 0 &&
            receiptTier !== "paid" &&
            dismissedProIdentity !== paidCreditSummary.identityKey ? (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 px-4 py-6 md:col-span-2">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pro-credit-title"
                  className="relative w-full max-w-sm rounded-card border border-primary/25 bg-white p-6 shadow-2xl"
                >
                  <button
                    type="button"
                    aria-label="Dismiss Pro credit notice"
                    onClick={() =>
                      setDismissedProIdentity(paidCreditSummary.identityKey)
                    }
                    className="absolute right-4 top-3 flex size-9 items-center justify-center rounded-full text-xl font-bold text-text-muted hover:bg-surface-subtle"
                  >
                    ×
                  </button>
                  <p className="text-sm font-extrabold text-primary">
                    Receipts Pro
                  </p>
                  <p
                    id="pro-credit-title"
                    className="mt-1 pr-8 text-lg font-black text-text-strong"
                  >
                    You have {paidCreditSummary.paidRemaining} Pro receipt credits
                    remaining.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    Use your Pro design for this receipt at no extra charge.
                  </p>
                  <button
                    type="button"
                    onClick={() => setReceiptTier("paid")}
                    className="mt-5 min-h-12 w-full rounded-button bg-primary px-4 font-extrabold text-white hover:bg-primary-hover"
                  >
                    Use Pro for this receipt
                  </button>
                </div>
              </div>
            ) : null}

            {showLandlordEmail ? (
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Landlord&apos;s email <span className="font-medium text-text-muted">(optional)</span>
              </label>
              <input
                name="landlordEmail"
                type="email"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.landlordEmail?.[0]),
                )}
                placeholder="e.g. landlord@example.com"
              />
              <FieldError message={state.fieldErrors?.landlordEmail?.[0]} />
            </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLandlordEmail(true)}
                className="min-h-11 justify-self-start text-sm font-extrabold text-primary hover:text-primary-hover md:col-span-2"
              >
                + Add landlord email (optional)
              </button>
            )}
          </div>
        </section>

        <section className="rounded-card border border-border-soft bg-surface p-5 md:p-7">
          <SectionHeading number={2}>Tenant</SectionHeading>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenant&apos;s full name
              </label>
              <input
                name="tenantFullName"
                value={tenantFullName}
                onChange={(event) => setTenantFullName(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenantFullName?.[0]),
                )}
                placeholder="e.g. Ada Nwosu"
              />
              <FieldError message={state.fieldErrors?.tenantFullName?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenant&apos;s phone number
              </label>
              <input
                name="tenantPhoneNumber"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenantPhoneNumber?.[0]),
                )}
                placeholder="e.g. 08123456789"
              />
              <FieldError message={state.fieldErrors?.tenantPhoneNumber?.[0]} />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-border-soft bg-surface p-5 md:p-7">
          <SectionHeading number={3}>Property being rented</SectionHeading>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Property name
              </label>
              <input
                name="propertyName"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.propertyName?.[0]),
                )}
                placeholder="Optional — e.g. Green Court Apartments"
              />
              <FieldError message={state.fieldErrors?.propertyName?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Flat or unit number
              </label>
              <input
                name="unitIdentifier"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.unitIdentifier?.[0]),
                )}
                placeholder="e.g. Flat 2B"
              />
              <FieldError message={state.fieldErrors?.unitIdentifier?.[0]} />
              <p className="mt-2 text-sm text-text-muted">
                Leave blank if it&apos;s a whole house
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Property Address
              </label>
              <input
                name="propertyAddress"
                value={propertyAddress}
                onChange={(event) => setPropertyAddress(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.propertyAddress?.[0]),
                )}
                placeholder="e.g. 15 Admiralty Road"
              />
              <FieldError message={state.fieldErrors?.propertyAddress?.[0]} />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                City and state
              </label>
              <input
                name="cityState"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.cityState?.[0]),
                )}
                placeholder="e.g. Lekki, Lagos"
              />
              <FieldError message={state.fieldErrors?.cityState?.[0]} />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-border-soft bg-surface p-5 md:p-7">
          <SectionHeading number={4}>Payment</SectionHeading>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Total rent due
              </label>
              <input
                name="totalRentDue"
                inputMode="decimal"
                value={totalRentDue}
                onChange={(event) => setTotalRentDue(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.totalRentDue?.[0]),
                )}
                placeholder="e.g. 1200000"
              />
              <FieldError message={state.fieldErrors?.totalRentDue?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Rent paid
              </label>
              <input
                name="rentAmount"
                inputMode="decimal"
                value={rentAmountPaid}
                onChange={(event) => setRentAmountPaid(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.rentAmount?.[0]),
                )}
                placeholder="e.g. 1000000"
              />
              <FieldError message={state.fieldErrors?.rentAmount?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Date paid
              </label>
              <input
                name="paymentDate"
                type="date"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.paymentDate?.[0]),
                )}
              />
              <FieldError message={state.fieldErrors?.paymentDate?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Rent starts on
              </label>
              <input
                name="rentStartDate"
                type="date"
                value={rentStartDate}
                onChange={(event) => setRentStartDate(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.rentStartDate?.[0]),
                )}
              />
              <FieldError message={state.fieldErrors?.rentStartDate?.[0]} />
            </div>

            <div>
              <p className="text-sm font-bold text-text-strong">
                How long does this rent cover?
              </p>
              <input type="hidden" name="rentDuration" value={rentDuration} />
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ["6_months", "6 months"],
                  ["1_year", "1 year"],
                  ["2_years", "2 years"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={rentDuration === value}
                    onClick={() => setRentDuration(value)}
                    className={`min-h-12 rounded-[10px] border-[1.5px] px-4 text-sm font-bold transition ${
                      rentDuration === value
                        ? "border-primary bg-primary text-white"
                        : "border-[#a8a394] bg-white text-text-strong hover:border-primary hover:bg-primary-soft"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <FieldError message={state.fieldErrors?.rentDuration?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Rent ends on
              </label>
              <input
                value={calculatedEndDate}
                readOnly
                aria-live="polite"
                className={fieldClassName(false)}
                placeholder="Set the rent start date"
              />
              <p className="mt-2 text-sm text-text-muted">
                Calculated automatically from the start date and duration.
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-text-strong">
                How was it paid?
              </p>
              <input type="hidden" name="paymentMethod" value={paymentMethod} />
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ["bank_transfer", "Bank transfer"],
                  ["cash", "Cash"],
                  ["paystack_gateway", "Paystack"],
                  ["other", "Other"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={paymentMethod === value}
                    onClick={() => setPaymentMethod(value)}
                    className={`min-h-12 rounded-[10px] border-[1.5px] px-4 text-sm font-bold transition ${
                      paymentMethod === value
                        ? "border-primary bg-primary text-white"
                        : "border-[#a8a394] bg-white text-text-strong hover:border-primary hover:bg-primary-soft"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <FieldError message={state.fieldErrors?.paymentMethod?.[0]} />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Payment reference{" "}
                <span className="font-medium text-text-muted">(optional)</span>
              </label>
              <input
                name="paymentReference"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.paymentReference?.[0]),
                )}
                placeholder="Optional — e.g. bank transfer reference"
              />
              <FieldError message={state.fieldErrors?.paymentReference?.[0]} />
            </div>

            <div className="rounded-[10px] bg-success-soft p-4 md:col-span-2">
              <p className="text-sm font-bold text-success">
                This rent covers
              </p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {rentStartDate && calculatedEndDate
                  ? `${rentStartDate} to ${calculatedEndDate}`
                  : "Choose the rent start date"}
              </p>
              {rentStartDate && calculatedEndDate ? (
                <p className="mt-1 text-sm font-semibold text-success">
                  Please check these dates before you continue.
                </p>
              ) : null}
              {calculatedBalance !== null && totalRentDue && rentAmountPaid ? (
                <p className="mt-3 border-t border-success/20 pt-3 text-base font-black text-text-strong">
                  Balance outstanding: ₦
                  {calculatedBalance.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 border-t border-border-soft pt-6">
            <h3 className="text-lg font-black text-text-strong">
              Signatures and stamp
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              The landlord signature is optional and is used only on this receipt.
            </p>
            <div className="mt-4 grid gap-4">
              <SignaturePadField
                key={`landlord-${signatureResetKey}`}
                name="landlordSignature"
                label="Landlord's signature"
                signerName={landlordFullName}
              />
              {receiptTier === "paid" ? (
                <div>
                  <ReceiptStampField key={`stamp-${signatureResetKey}`} />
                </div>
              ) : null}
            </div>
          </div>

          {state.message ? (
            <div
              className={`mt-5 rounded-button p-4 text-sm font-semibold leading-6 ${
                state.ok
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          {state.paymentRequired ? (
            <div className="mt-5 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
              <PublicDocumentPaymentButton
                product="receipt"
                formId="public-receipt-generator-form"
                identity={{
                  landlordFullName,
                  landlordPhoneNumber,
                  propertyAddress,
                }}
              />
            </div>
          ) : null}

          <div className="mt-6">
            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={isPending}
              className="min-h-14 text-lg"
            >
              {isPending
                ? "Generating receipt..."
                : receiptTier === "paid"
                  ? "Generate Pro receipt"
                  : "Generate my receipt"}
            </Button>
            <p className="mt-3 text-center text-xs font-semibold text-text-muted">
              Free receipts carry a small BOPA note at the bottom.
            </p>
          </div>
        </section>
      </form>

      <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
        {state.ok && state.receipt ? (
          <>
            <GeneratedReceiptResult receipt={state.receipt} />
            <FreeToolAccountPrompt claimUrl={state.receipt.claimUrl} />
          </>
        ) : (
          <div className="hidden overflow-hidden rounded-card border border-border-soft bg-white xl:block">
            <div className="border-b border-border-soft bg-primary-soft p-5">
              <p className="text-sm font-bold text-primary">
                Your receipt will look like this
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
                Rent receipt
              </h2>
              <p className="mt-1 text-xs font-semibold text-text-muted">
                Receipt number added for you
              </p>
            </div>
            <div className="space-y-5 p-5 text-sm">
              <div>
                <p className="font-semibold text-text-muted">Received from</p>
                <p className="mt-1 font-extrabold text-text-strong">Tenant&apos;s name</p>
              </div>
              <div>
                <p className="font-semibold text-text-muted">Paid to</p>
                <p className="mt-1 font-extrabold text-text-strong">Landlord&apos;s name</p>
              </div>
              <div>
                <p className="font-semibold text-text-muted">For the property at</p>
                <p className="mt-1 font-extrabold text-text-strong">Property address</p>
              </div>
              <div className="rounded-[10px] bg-primary-soft p-4">
                <p className="font-semibold text-primary">Amount</p>
                <p className="mt-1 text-2xl font-black text-text-strong">₦0</p>
              </div>
              <div>
                <p className="font-semibold text-text-muted">Rent period</p>
                <p className="mt-1 font-extrabold text-text-strong">Start date to end date</p>
              </div>
              <div className="flex gap-2 rounded-[10px] bg-success-soft p-3 font-semibold text-success">
                <Check aria-hidden="true" className="mt-0.5 shrink-0" size={17} strokeWidth={3} />
                Your details appear here after you generate the receipt.
              </div>
            </div>
          </div>

        )}
      </aside>

    </div>
  );
}
