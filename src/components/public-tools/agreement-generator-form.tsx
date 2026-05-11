"use client";

import { useActionState, useMemo, useState } from "react";
import { generatePublicAgreementAction } from "@/actions/public-agreement-generator.actions";
import { initialPublicAgreementGeneratorState } from "@/actions/public-agreement-generator.state";
import { GeneratedAgreementResult } from "@/components/public-tools/generated-agreement-result";
import { Button } from "@/components/ui/button";

type AgreementGeneratorFormProps = {
  sourcePath: string;
};

function addMonths(date: Date, months: number) {
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  result.setUTCMonth(result.getUTCMonth() + months);

  return result;
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

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
  const start = new Date(`${startDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime())) {
    return "";
  }

  const end = addMonths(start, months);
  end.setUTCDate(end.getUTCDate() - 1);

  return formatDateOnly(end);
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
  const [agreementStartDate, setAgreementStartDate] = useState("");
  const [agreementDuration, setAgreementDuration] = useState("1_year");

  const calculatedEndDate = useMemo(
    () => calculateEndDate(agreementStartDate, agreementDuration),
    [agreementStartDate, agreementDuration],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="sourcePath" value={sourcePath} />

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <h2 className="text-lg font-black text-text-strong">
            Landlord Information
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Landlord Full Name
              </label>
              <input
                name="landlordFullName"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.landlordFullName?.[0]),
                )}
                placeholder="e.g. Mr Chinedu Okafor"
              />
              <FieldError message={state.fieldErrors?.landlordFullName?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Phone Number
              </label>
              <input
                name="landlordPhoneNumber"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.landlordPhoneNumber?.[0]),
                )}
                placeholder="e.g. 08012345678"
              />
              <FieldError
                message={state.fieldErrors?.landlordPhoneNumber?.[0]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Email Address Optional
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
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <h2 className="text-lg font-black text-text-strong">
            Tenant Information
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenant Full Name
              </label>
              <input
                name="tenantFullName"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenantFullName?.[0]),
                )}
                placeholder="e.g. Ada Nwosu"
              />
              <FieldError message={state.fieldErrors?.tenantFullName?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenant Phone Number
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

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Tenant Email Optional
              </label>
              <input
                name="tenantEmail"
                type="email"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenantEmail?.[0]),
                )}
                placeholder="e.g. tenant@example.com"
              />
              <FieldError message={state.fieldErrors?.tenantEmail?.[0]} />
            </div>
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <h2 className="text-lg font-black text-text-strong">
            Property Information
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Property Name Optional
              </label>
              <input
                name="propertyName"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.propertyName?.[0]),
                )}
                placeholder="e.g. Green Court Apartments"
              />
              <FieldError message={state.fieldErrors?.propertyName?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Unit / Flat / Shop
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

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Property Address
              </label>
              <input
                name="propertyAddress"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.propertyAddress?.[0]),
                )}
                placeholder="e.g. 15 Admiralty Road"
              />
              <FieldError message={state.fieldErrors?.propertyAddress?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                City / State
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

            <div>
              <label className="text-sm font-bold text-text-strong">
                Property Use
              </label>
              <select
                name="propertyUse"
                defaultValue="residential"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.propertyUse?.[0]),
                )}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="mixed_use">Mixed Use</option>
              </select>
              <FieldError message={state.fieldErrors?.propertyUse?.[0]} />
            </div>
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <h2 className="text-lg font-black text-text-strong">Tenancy Terms</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Rent Amount
              </label>
              <input
                name="rentAmount"
                inputMode="decimal"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.rentAmount?.[0]),
                )}
                placeholder="e.g. 1200000"
              />
              <FieldError message={state.fieldErrors?.rentAmount?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Caution Deposit
              </label>
              <input
                name="cautionDepositAmount"
                inputMode="decimal"
                defaultValue="0"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.cautionDepositAmount?.[0]),
                )}
                placeholder="e.g. 100000"
              />
              <FieldError
                message={state.fieldErrors?.cautionDepositAmount?.[0]}
              />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenancy Start Date
              </label>
              <input
                name="agreementStartDate"
                type="date"
                value={agreementStartDate}
                onChange={(event) => setAgreementStartDate(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.agreementStartDate?.[0]),
                )}
              />
              <FieldError
                message={state.fieldErrors?.agreementStartDate?.[0]}
              />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenancy Duration
              </label>
              <select
                name="agreementDuration"
                value={agreementDuration}
                onChange={(event) => setAgreementDuration(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.agreementDuration?.[0]),
                )}
              >
                <option value="6_months">6 months</option>
                <option value="1_year">1 year</option>
                <option value="2_years">2 years</option>
              </select>
              <FieldError message={state.fieldErrors?.agreementDuration?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Payment Frequency
              </label>
              <select
                name="paymentFrequency"
                defaultValue="annual"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.paymentFrequency?.[0]),
                )}
              >
                <option value="annual">Annual</option>
                <option value="six_months">Every 6 months</option>
                <option value="monthly">Monthly</option>
              </select>
              <FieldError message={state.fieldErrors?.paymentFrequency?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Renewal Notice Days
              </label>
              <input
                name="renewalNoticeDays"
                inputMode="numeric"
                defaultValue="30"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.renewalNoticeDays?.[0]),
                )}
              />
              <FieldError message={state.fieldErrors?.renewalNoticeDays?.[0]} />
            </div>

            <div className="rounded-button bg-primary-soft p-4 md:col-span-2">
              <p className="text-sm font-bold text-primary">
                Calculated Tenancy End Date
              </p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {calculatedEndDate || "Select tenancy start date"}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Additional Terms Optional
              </label>
              <textarea
                name="additionalTerms"
                rows={5}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.additionalTerms?.[0]),
                )}
                placeholder="Add special terms, restrictions, repair responsibilities, service charge notes, or other agreed conditions."
              />
              <FieldError message={state.fieldErrors?.additionalTerms?.[0]} />
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

          <div className="mt-6">
            <Button type="submit" size="lg" fullWidth disabled={isPending}>
              {isPending
                ? "Generating Agreement..."
                : "Generate Agreement Preview"}
            </Button>
          </div>
        </section>
      </form>

      <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
        {state.ok && state.agreement ? (
          <GeneratedAgreementResult agreement={state.agreement} />
        ) : (
          <div className="rounded-card bg-surface p-5 shadow-card md:p-6">
            <p className="text-sm font-bold text-primary">Free public tool</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-text-strong">
              Generate an agreement preview before signing up.
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              BOPA helps Nigerian landlords prepare structured tenancy agreement
              details before saving, editing, or downloading documents in later
              batches.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
