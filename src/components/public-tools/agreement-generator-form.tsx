"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { generatePublicAgreementAction } from "@/actions/public-agreement-generator.actions";
import { initialPublicAgreementGeneratorState } from "@/actions/public-agreement-generator.state";
import { FreeAgreementAccountPrompt } from "@/components/public-tools/free-agreement-account-prompt";
import { GeneratedAgreementResult } from "@/components/public-tools/generated-agreement-result";
import { PublicDocumentPaymentButton } from "@/components/public-tools/public-document-payment-button";
import { Button } from "@/components/ui/button";
import {
  addDaysToDateOnly,
  calculateAnchoredRentCycleDate,
} from "@/lib/rent-cycle";

type AgreementGeneratorFormProps = {
  sourcePath: string;
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

function toDisplayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function amountInWords(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const small = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const underThousand = (n: number): string => {
    if (n < 20) return small[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? `-${small[n % 10]}` : ""}`;
    return `${small[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${underThousand(n % 100)}` : ""}`;
  };
  let remaining = Math.floor(value);
  const parts: string[] = [];
  for (const [size, label] of [[1_000_000, "million"], [1_000, "thousand"]] as const) {
    const count = Math.floor(remaining / size);
    if (count) parts.push(`${underThousand(count)} ${label}`);
    remaining %= size;
  }
  if (remaining) parts.push(underThousand(remaining));
  return `${parts.join(", ")} naira`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-semibold text-danger">{message}</p>;
}

function fieldClassName(hasError: boolean) {
  return [
    "min-h-12 w-full rounded-button border bg-white px-4 py-3 text-base text-text-strong outline-none transition",
    hasError
      ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger-soft"
      : "border-border-soft focus:border-primary focus:ring-2 focus:ring-primary-soft",
  ].join(" ");
}

export function AgreementGeneratorForm({
  sourcePath,
}: AgreementGeneratorFormProps) {
  const [state, formAction, isPending] = useActionState(
    generatePublicAgreementAction,
    initialPublicAgreementGeneratorState,
  );

  const [tenancyStartDate, setTenancyStartDate] = useState("");
  const [tenancyDuration, setTenancyDuration] = useState("1_year");
  const [agreementTier, setAgreementTier] = useState<"free" | "paid">("free");
  const [showPartyExtras, setShowPartyExtras] = useState(false);
  const [showPropertyName, setShowPropertyName] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSpecialTerms, setShowSpecialTerms] = useState(false);
  const [propertyUse, setPropertyUse] = useState("residential");
  const [rentFrequency, setRentFrequency] = useState("annual");
  const [rentAmount, setRentAmount] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDetails, setReviewDetails] = useState<Record<string, string>>({});
  const [dateError, setDateError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const allowedFrequencies = useMemo(() => {
    if (tenancyDuration === "6_months") return ["biannual", "quarterly", "monthly"];
    return ["annual", "biannual", "quarterly", "monthly"];
  }, [tenancyDuration]);

  const calculatedEndDate = useMemo(
    () => calculateEndDate(tenancyStartDate, tenancyDuration),
    [tenancyStartDate, tenancyDuration],
  );
  function changeSection(section: number) {
    setReviewOpen(false);
    window.setTimeout(() => document.getElementById(`agreement-section-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  if (state.ok && state.agreement) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          <GeneratedAgreementResult agreement={state.agreement} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          {state.agreement.agreementTier === "free" ? (
            <FreeAgreementAccountPrompt claimUrl={state.agreement.claimUrl} />
          ) : null}

          <div className="rounded-card bg-surface p-5 shadow-card md:p-6">
            <p className="text-sm font-bold text-primary">Agreement Summary</p>

            <div className="mt-4 space-y-3 text-sm leading-6">
              <div>
                <p className="font-bold text-text-muted">Landlord</p>
                <p className="font-black text-text-strong">
                  {state.agreement.landlordFullName}
                </p>
              </div>

              <div>
                <p className="font-bold text-text-muted">Tenant</p>
                <p className="font-black text-text-strong">
                  {state.agreement.tenantFullName}
                </p>
              </div>

              <div>
                <p className="font-bold text-text-muted">Property</p>
                <p className="font-black text-text-strong">
                  {state.agreement.propertyLabel}
                </p>
              </div>

              <div>
                <p className="font-bold text-text-muted">Status</p>
                <p className="font-black text-warning">
                  {state.agreement.agreementTier === "paid"
                    ? "Tenancy Agreement Pro"
                    : "Watermarked public preview"}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_270px] xl:items-start">
      <form
        ref={formRef}
        id="public-agreement-generator-form"
        action={formAction}
        onSubmit={(event) => {
          if (reviewOpen) return;
          event.preventDefault();
          if (!tenancyStartDate) {
            setDateError("Select a tenancy start date.");
            return;
          }
          setDateError("");
          const details = Object.fromEntries(
            Array.from(new FormData(event.currentTarget).entries()).map(([key, value]) => [key, String(value)]),
          );
          setReviewDetails(details);
          setReviewOpen(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="space-y-6 pb-20 md:pb-0"
      >
        <input type="hidden" name="sourcePath" value={sourcePath} />
        <input type="hidden" name="agreementTier" value={agreementTier} />
        {!reviewOpen ? <div className="rounded-card border border-border-soft bg-white p-4 text-xs font-bold text-text-strong xl:hidden">1 Fill in → 2 Preview → 3 Change → 4 Download</div> : null}

        {reviewOpen ? (
          <section className="rounded-card border border-border-soft bg-white p-5 shadow-card md:p-8">
            <p className="text-sm font-bold text-primary">Review before creating</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-text-strong">TENANCY AGREEMENT</h2>
            <div className="mt-5 space-y-4 border-y border-border-soft py-5 font-serif text-sm leading-7 text-text-strong">
              <div className="flex items-start justify-between gap-3"><p><strong>LANDLORD:</strong> {reviewDetails.landlordFullName || "—"}<br/><strong>TENANT:</strong> {reviewDetails.tenantFullName || "—"}</p><button type="button" onClick={() => changeSection(1)} className="text-sm font-bold text-primary">Change</button></div>
              <div className="flex items-start justify-between gap-3"><p><strong>1. PREMISES.</strong> { [reviewDetails.propertyName, reviewDetails.unitIdentifier, reviewDetails.propertyAddress, reviewDetails.cityState].filter(Boolean).join(", ") || "—" }</p><button type="button" onClick={() => changeSection(2)} className="text-sm font-bold text-primary">Change</button></div>
              <div className="flex items-start justify-between gap-3"><p><strong>2. TERM.</strong> {toDisplayDate(tenancyStartDate)} to {toDisplayDate(calculatedEndDate) || "—"}</p><button type="button" onClick={() => changeSection(3)} className="text-sm font-bold text-primary">Change</button></div>
              <p><strong>3. RENT.</strong> ₦{Number(rentAmount || 0).toLocaleString("en-NG")} {rentFrequency === "annual" ? "per year" : rentFrequency === "biannual" ? "every 6 months" : rentFrequency === "quarterly" ? "per quarter" : "per month"}.</p>
              <p><strong>4. PROPERTY USE.</strong> {propertyUse.replace("_", " ")}.</p>
              <p><strong>5. NOTICE.</strong> {reviewDetails.terminationNoticeMonths ? `${reviewDetails.terminationNoticeMonths} month(s), subject to applicable law` : "Applicable legal notice"}.</p>
              {reviewDetails.propertyRules || reviewDetails.specialTerms ? <div className="flex items-start justify-between gap-3"><p><strong>EXTRA TERMS.</strong> {[reviewDetails.propertyRules, reviewDetails.specialTerms].filter(Boolean).join(" ")}</p><button type="button" onClick={() => changeSection(4)} className="text-sm font-bold text-primary">Change</button></div> : null}
            </div>
            <p className="mt-4 text-sm text-text-muted">Check these details. Creating the document uses one {agreementTier === "paid" ? "Pro" : "free"} agreement credit.</p>
            {state.message && !state.ok ? <p className="mt-3 text-sm font-semibold text-danger">{state.message}</p> : null}
            {state.paymentRequired ? <div className="mt-4 max-w-xs"><PublicDocumentPaymentButton product="tenancy_agreement" formId="public-agreement-generator-form" label="Get 3 Pro agreements" onOpen={() => setAgreementTier("paid")} onPaymentVerified={() => setAgreementTier("paid")} /></div> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => setReviewOpen(false)} className="min-h-12 rounded-button border-2 border-primary px-5 font-bold text-primary">Change details</button>
              <Button type="submit" size="lg" disabled={isPending}>{isPending ? "Creating…" : "Create and download agreement"}</Button>
            </div>
          </section>
        ) : null}

        <details className={`rounded-card border border-border-soft bg-white p-4 ${reviewOpen ? "hidden" : ""}`}>
          <summary className="cursor-pointer text-sm font-extrabold text-primary">Free and Pro agreement options</summary>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight text-text-strong">
              Choose a free or Pro agreement
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Your first 3 tenancy agreements are free. Pro removes the BOPA
              watermark and footer from the finished PDF.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div
              className={`flex flex-col rounded-card border-2 bg-white p-5 ${
                agreementTier === "free"
                  ? "border-primary"
                  : "border-border-soft"
              }`}
            >
              <span className="w-fit rounded-full bg-[#eceae4] px-3 py-1 text-xs font-extrabold text-text-muted">
                Free
              </span>
              <h3 className="mt-3 text-xl font-black text-text-strong">
                Free tenancy agreement
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Watermarked, no account needed
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm leading-6 text-text-normal">
                <li>✓ Standard Nigerian tenancy agreement</li>
                <li>✓ Add landlord, tenant, property, rent and term</li>
                <li>✓ Preview, download and share on WhatsApp</li>
                <li>✓ Watermarked PDF</li>
              </ul>
              <button
                type="button"
                onClick={() => setAgreementTier("free")}
                className="mt-6 min-h-12 w-full rounded-button border-2 border-primary bg-white px-4 font-extrabold text-primary hover:bg-primary-soft"
              >
                Make a free tenancy agreement
              </button>
            </div>

            <div
              className={`flex flex-col rounded-card border-2 bg-white p-5 ${
                agreementTier === "paid"
                  ? "border-primary bg-primary-soft/20"
                  : "border-primary"
              }`}
            >
              <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-white">
                Tenancy Agreement Pro
              </span>
              <h3 className="mt-3 text-xl font-black text-text-strong">
                Clean Pro agreements
              </h3>
              <p className="mt-1 text-2xl font-black text-text-strong">
                ₦10,000 for 3
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm leading-6 text-text-normal">
                <li className="font-bold">✓ Everything in Free, plus:</li>
                <li>✓ No watermark or BOPA footer</li>
                <li>✓ Pro agreement presentation</li>
                <li>✓ Download PDF and share on WhatsApp</li>
                <li>✓ Three successful Pro agreements</li>
              </ul>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setAgreementTier("paid")}
                  className="min-h-12 w-full rounded-button border-2 border-primary bg-white px-4 font-extrabold text-primary hover:bg-primary-soft"
                >
                  Use my Pro credits
                </button>
                <PublicDocumentPaymentButton
                  product="tenancy_agreement"
                  formId="public-agreement-generator-form"
                  label="Get Tenancy Agreement Pro"
                  onOpen={() => setAgreementTier("paid")}
                  onPaymentVerified={() => setAgreementTier("paid")}
                />
              </div>
            </div>
          </div>
        </details>

        <section id="agreement-section-1" className={`rounded-card bg-surface p-5 shadow-card md:p-6 ${reviewOpen ? "hidden" : ""}`}>
          <div>
            <h2 className="flex items-center gap-3 text-lg font-black text-text-strong">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white">1</span>
              Landlord and tenant
            </h2>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Landlord Full Name
              </label>
              <input
                name="landlordFullName"
                required
                className={fieldClassName(
                  Boolean(state.fieldErrors?.landlordFullName?.[0]),
                )}
                placeholder="e.g. Mr Chinedu Okafor"
                autoComplete="name"
              />
              <FieldError message={state.fieldErrors?.landlordFullName?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Landlord Phone Number
              </label>
              <input
                name="landlordPhoneNumber"
                required
                className={fieldClassName(
                  Boolean(state.fieldErrors?.landlordPhoneNumber?.[0]),
                )}
                placeholder="e.g. 08012345678"
                autoComplete="tel"
              />
              <FieldError
                message={state.fieldErrors?.landlordPhoneNumber?.[0]}
              />
            </div>

            {showPartyExtras ? <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Landlord email (optional)
              </label>
              <input
                name="landlordEmail"
                type="email"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.landlordEmail?.[0]),
                )}
                placeholder="e.g. landlord@example.com"
                autoComplete="email"
              />
              <FieldError message={state.fieldErrors?.landlordEmail?.[0]} />
              <label className="mt-4 block text-sm font-bold text-text-strong">Landlord address (optional)</label>
              <input name="landlordAddress" className={fieldClassName(Boolean(state.fieldErrors?.landlordAddress?.[0]))} placeholder="Address for the agreement" />
            </div> : null}
          </div>
          <p className="mt-6 text-sm font-bold text-text-muted">Tenant</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenant Full Name
              </label>
              <input
                name="tenantFullName"
                required
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenantFullName?.[0]),
                )}
                placeholder="e.g. Ada Nwosu"
                autoComplete="name"
              />
              <FieldError message={state.fieldErrors?.tenantFullName?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenant Phone Number
              </label>
              <input
                name="tenantPhoneNumber"
                required
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenantPhoneNumber?.[0]),
                )}
                placeholder="e.g. 08123456789"
                autoComplete="tel"
              />
              <FieldError message={state.fieldErrors?.tenantPhoneNumber?.[0]} />
            </div>

            {showPartyExtras ? <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Tenant email (optional)
              </label>
              <input
                name="tenantEmail"
                type="email"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenantEmail?.[0]),
                )}
                placeholder="e.g. tenant@example.com"
                autoComplete="email"
              />
              <FieldError message={state.fieldErrors?.tenantEmail?.[0]} />
              <label className="mt-4 block text-sm font-bold text-text-strong">Tenant address (optional)</label>
              <input name="tenantAddress" className={fieldClassName(Boolean(state.fieldErrors?.tenantAddress?.[0]))} placeholder="Address for the agreement" />
            </div> : null}
          </div>
          <button type="button" onClick={() => setShowPartyExtras(!showPartyExtras)} className="mt-4 min-h-11 text-sm font-bold text-primary">
            {showPartyExtras ? "− Hide addresses and emails" : "+ Add addresses or emails (optional)"}
          </button>
        </section>

        <section id="agreement-section-2" className={`rounded-card bg-surface p-5 shadow-card md:p-6 ${reviewOpen ? "hidden" : ""}`}>
          <div>
            <h2 className="flex items-center gap-3 text-lg font-black text-text-strong">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white">2</span>
              Property
            </h2>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {showPropertyName ? <div className="order-5">
              <label className="text-sm font-bold text-text-strong">
                Property name (optional)
              </label>
              <input
                name="propertyName"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.propertyName?.[0]),
                )}
                placeholder="e.g. Green Court Apartments"
              />
              <FieldError message={state.fieldErrors?.propertyName?.[0]} />
            </div> : null}

            <div className="order-3">
              <label className="text-sm font-bold text-text-strong">
                Flat, unit or shop (optional)
              </label>
              <input
                name="unitIdentifier"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.unitIdentifier?.[0]),
                )}
                placeholder="e.g. Flat 2B"
              />
              <FieldError message={state.fieldErrors?.unitIdentifier?.[0]} />
            </div>

            <div className="order-1 md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Property Address
              </label>
              <input
                name="propertyAddress"
                required
                className={fieldClassName(
                  Boolean(state.fieldErrors?.propertyAddress?.[0]),
                )}
                placeholder="e.g. 15 Admiralty Road"
              />
              <FieldError message={state.fieldErrors?.propertyAddress?.[0]} />
            </div>

            <div className="order-2">
              <label className="text-sm font-bold text-text-strong">
                City / State
              </label>
              <input
                name="cityState"
                required
                className={fieldClassName(
                  Boolean(state.fieldErrors?.cityState?.[0]),
                )}
                placeholder="e.g. Lekki, Lagos"
              />
              <FieldError message={state.fieldErrors?.cityState?.[0]} />
            </div>

            <div className="order-4 md:col-span-2">
              <p className="text-sm font-bold text-text-strong">How will the property be used?</p>
              <input type="hidden" name="propertyUse" value={propertyUse} />
              <div className="mt-2 flex flex-wrap gap-2">
                {([ ["residential", "Residential"], ["commercial", "Commercial"], ["mixed_use", "Mixed use"] ] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setPropertyUse(value)} aria-pressed={propertyUse === value} className={`min-h-11 rounded-button border px-4 text-sm font-bold ${propertyUse === value ? "border-primary bg-primary text-white" : "border-border-soft bg-white text-text-strong"}`}>{label}</button>
                ))}
              </div>
              <p className="mt-2 text-xs text-text-muted">This changes the wording about how the property may be used.</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowPropertyName(!showPropertyName)} className="mt-4 min-h-11 text-sm font-bold text-primary">
            {showPropertyName ? "− Hide property name" : "+ Add property name (optional)"}
          </button>
        </section>

        <section id="agreement-section-3" className={`rounded-card bg-surface p-5 shadow-card md:p-6 ${reviewOpen ? "hidden" : ""}`}>
          <div>
            <h2 className="flex items-center gap-3 text-lg font-black text-text-strong">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white">3</span>
              Term and rent
            </h2>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Tenancy starts on
              </label>
              <input
                name="tenancyStartDate"
                type="date"
                value={tenancyStartDate}
                onChange={(event) => {
                  setTenancyStartDate(event.target.value);
                  setDateError("");
                }}
                required
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenancyStartDate?.[0]),
                )}
              />
              <p className="mt-1 text-xs text-text-muted">
                {tenancyStartDate ? `Selected: ${toDisplayDate(tenancyStartDate)}` : "Choose the start date from the calendar."}
              </p>
              <FieldError message={dateError || state.fieldErrors?.tenancyStartDate?.[0]} />
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-bold text-text-strong">How long is the tenancy?</p>
              <input type="hidden" name="tenancyDuration" value={tenancyDuration} />
              <div className="mt-2 flex flex-wrap gap-2">
                {([ ["6_months", "6 months"], ["1_year", "1 year"], ["2_years", "2 years"] ] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={tenancyDuration === value} onClick={() => { setTenancyDuration(value); if (value === "6_months" && rentFrequency === "annual") setRentFrequency("biannual"); }} className={`min-h-11 rounded-button border px-4 text-sm font-bold ${tenancyDuration === value ? "border-primary bg-primary text-white" : "border-border-soft bg-white text-text-strong"}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="rounded-button bg-primary-soft p-4 md:col-span-2">
              <p className="text-sm font-bold text-primary">
                THE TENANCY WILL RUN
              </p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {calculatedEndDate
                  ? `${toDisplayDate(tenancyStartDate)} to ${toDisplayDate(calculatedEndDate)}`
                  : "Choose a start date and we'll work out the end date"}
              </p>
              {calculatedEndDate ? (
                <p className="mt-1 text-sm text-text-muted">
                  End date calculated for {tenancyDuration === "6_months" ? "6 months" : tenancyDuration === "2_years" ? "2 years" : "1 year"}.
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Rent amount
              </label>
              <div className="relative"><span className="absolute left-4 top-3.5 font-bold">₦</span>
                <input name="rentAmount" required value={rentAmount} onChange={(event) => setRentAmount(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className={`${fieldClassName(Boolean(state.fieldErrors?.rentAmount?.[0]))} pl-9`} placeholder="1,200,000" />
              </div>
              <p className="mt-1 text-xs text-text-muted">We&apos;ll show the amount in words so you can check it.</p>
              {Number(rentAmount) > 0 ? <p className="mt-1 text-xs font-semibold text-primary">{amountInWords(Number(rentAmount))}</p> : null}
              <FieldError message={state.fieldErrors?.rentAmount?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Caution deposit
              </label>
              <div className="relative"><span className="absolute left-4 top-3.5 font-bold">₦</span><input name="cautionDepositAmount" inputMode="decimal" className={`${fieldClassName(Boolean(state.fieldErrors?.cautionDepositAmount?.[0]))} pl-9`} placeholder="Leave empty if none" /></div>
              <p className="mt-1 text-xs text-text-muted">We&apos;ll write &quot;none&quot; if you leave this empty.</p>
              <FieldError
                message={state.fieldErrors?.cautionDepositAmount?.[0]}
              />
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-bold text-text-strong">How often is rent paid?</p>
              <input type="hidden" name="rentFrequency" value={rentFrequency} />
              <div className="mt-2 flex flex-wrap gap-2">
                {([ ["annual", "Annual"], ["biannual", "Every 6 months"], ["quarterly", "Quarterly"], ["monthly", "Monthly"] ] as const).map(([value, label]) => (
                  <button key={value} type="button" disabled={!allowedFrequencies.includes(value)} aria-pressed={rentFrequency === value} onClick={() => setRentFrequency(value)} className={`min-h-11 rounded-button border px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${rentFrequency === value ? "border-primary bg-primary text-white" : "border-border-soft bg-white text-text-strong"}`}>{label}</button>
                ))}
              </div>
              <p className="mt-1 text-xs text-text-muted">Choices that don&apos;t fit the tenancy length are greyed out.</p>
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">Notice needed to end the tenancy</label>
              <select name="terminationNoticeMonths" defaultValue="" className={fieldClassName(Boolean(state.fieldErrors?.terminationNoticeMonths?.[0]))}>
                <option value="">Use applicable legal notice</option>
                <option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option>
              </select>
              <p className="mt-1 text-xs text-text-muted">Check this against the law where the property is located.</p>
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Renewal reply deadline (days)
              </label>
              <input
                name="renewalNoticeDays"
                inputMode="numeric"
                defaultValue="30"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.renewalNoticeDays?.[0]),
                )}
                placeholder="e.g. 30"
              />
              <FieldError message={state.fieldErrors?.renewalNoticeDays?.[0]} />
              <p className="mt-1 text-xs text-text-muted">How many days before the end should the tenant say if they want to renew?</p>
            </div>
          </div>
        </section>

        <section id="agreement-section-4" className={`rounded-card bg-surface p-5 shadow-card md:p-6 ${reviewOpen ? "hidden" : ""}`}>
          <div>
            <h2 className="flex items-center gap-3 text-lg font-black text-text-strong">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white">4</span>
              Extra rules and special terms
            </h2>
            <p className="mt-2 text-sm text-text-muted">Optional. Skip this if you do not need it.</p>
          </div>

          <div className="mt-4 grid gap-4">
            {showRules ? <div>
              <label className="text-sm font-bold text-text-strong">
                Property Requirements Optional
              </label>
              <textarea
                name="propertyRules"
                rows={5}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.propertyRules?.[0]),
                )}
                placeholder="Example: No subletting. No short-let use. Tenant must keep premises clean. No heavy generator without written consent."
              />
              <FieldError message={state.fieldErrors?.propertyRules?.[0]} />
              <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                These appear under the property requirements section of the
                agreement.
              </p>
            </div> : null}

            {showSpecialTerms ? <div>
              <label className="text-sm font-bold text-text-strong">
                Special Terms Optional
              </label>
              <textarea
                name="specialTerms"
                rows={5}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.specialTerms?.[0]),
                )}
                placeholder="Example: Tenant is responsible for prepaid meter recharge. Landlord handles structural repairs only."
              />
              <FieldError message={state.fieldErrors?.specialTerms?.[0]} />
              <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                These appear under the special terms section of the agreement.
              </p>
            </div> : null}
          </div>
          <div className="mt-3 flex flex-col items-start gap-2">
            <button type="button" onClick={() => setShowRules(!showRules)} className="min-h-11 text-sm font-bold text-primary">{showRules ? "− Hide house rules" : "+ Add house rules"}</button>
            <button type="button" onClick={() => setShowSpecialTerms(!showSpecialTerms)} className="min-h-11 text-sm font-bold text-primary">{showSpecialTerms ? "− Hide special terms" : "+ Add special terms"}</button>
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
                product="tenancy_agreement"
                formId="public-agreement-generator-form"
              />
            </div>
          ) : null}

          <div className="mt-6">
            <Button type="submit" size="lg" fullWidth disabled={isPending}>
              Preview my agreement
            </Button>
            <p className="mt-2 text-center text-xs text-text-muted">You can change details before creating the agreement. Free agreements carry a watermark.</p>
            <a href="https://wa.me/2348025127875?text=Hello%20BOPA%2C%20I%20need%20help%20with%20a%20tenancy%20agreement." target="_blank" rel="noreferrer" className="mt-4 flex min-h-11 items-center justify-center rounded-button border border-[#0F7A3D] text-sm font-bold text-[#0F7A3D]">Stuck? Chat with us on WhatsApp</a>
          </div>
        </section>
        {!reviewOpen ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-white/95 p-3 shadow-lg backdrop-blur md:hidden"><button type="submit" className="min-h-12 w-[calc(100%-72px)] rounded-button bg-primary px-4 font-bold text-white">Preview my agreement</button></div> : null}
      </form>

      <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
        <div className="hidden rounded-card border border-border-soft bg-white p-5 xl:block">
          <h2 className="font-black text-text-strong">How it works</h2>
          <ol className="mt-4 space-y-4 text-sm text-text-muted">
            <li><strong className="text-primary">1</strong> Fill in four sections. Skip optional details.</li>
            <li><strong className="text-primary">2</strong> Preview your details before creating.</li>
            <li><strong className="text-primary">3</strong> Change anything that needs fixing.</li>
            <li><strong className="text-primary">4</strong> Download the PDF or share on WhatsApp.</li>
          </ol>
        </div>
        <div className="rounded-card border-2 border-primary bg-white p-5">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">Tenancy Agreement Pro</span>
          <h2 className="mt-3 text-lg font-black text-text-strong">Want a clean Pro agreement?</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">Three agreements for ₦10,000, with no BOPA watermark or footer.</p>
          <button type="button" onClick={() => setAgreementTier("paid")} className="mt-4 min-h-11 w-full rounded-button border border-primary text-sm font-bold text-primary">Use my Pro credits</button>
          <div className="mt-2"><PublicDocumentPaymentButton product="tenancy_agreement" formId="public-agreement-generator-form" label="Get Tenancy Agreement Pro" onOpen={() => setAgreementTier("paid")} onPaymentVerified={() => setAgreementTier("paid")} /></div>
          {agreementTier === "paid" ? <button type="button" onClick={() => setAgreementTier("free")} className="mt-3 min-h-11 w-full text-sm font-bold text-primary">Use free agreement instead</button> : null}
        </div>
        <div className="rounded-card bg-[#eeeae1] p-4 text-xs leading-5 text-text-muted">
          <strong>Your details.</strong> Buying Pro sends the landlord&apos;s name, phone and property address to payment setup. Creating an agreement stores the names, phone numbers and document, even without an account.
        </div>
      </aside>
    </div>
  );
}
