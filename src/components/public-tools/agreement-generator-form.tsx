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

  const [tenancyStartDate, setTenancyStartDate] = useState("");
  const [tenancyDuration, setTenancyDuration] = useState("1_year");

  const calculatedEndDate = useMemo(
    () => calculateEndDate(tenancyStartDate, tenancyDuration),
    [tenancyStartDate, tenancyDuration],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="sourcePath" value={sourcePath} />

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <div>
            <p className="text-sm font-bold text-primary">Agreement parties</p>
            <h2 className="mt-1 text-lg font-black text-text-strong">
              Landlord Information
            </h2>
          </div>

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

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-text-strong">
                Landlord Email Optional
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
            </div>
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <div>
            <p className="text-sm font-bold text-primary">Agreement parties</p>
            <h2 className="mt-1 text-lg font-black text-text-strong">
              Tenant Information
            </h2>
          </div>

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
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenantPhoneNumber?.[0]),
                )}
                placeholder="e.g. 08123456789"
                autoComplete="tel"
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
                autoComplete="email"
              />
              <FieldError message={state.fieldErrors?.tenantEmail?.[0]} />
            </div>
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <div>
            <p className="text-sm font-bold text-primary">Premises</p>
            <h2 className="mt-1 text-lg font-black text-text-strong">
              Property / Unit Information
            </h2>
          </div>

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
                Approved Property Use
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
          <div>
            <p className="text-sm font-bold text-primary">Tenancy term</p>
            <h2 className="mt-1 text-lg font-black text-text-strong">
              Rent and Agreement Terms
            </h2>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenancy Start Date
              </label>
              <input
                name="tenancyStartDate"
                type="date"
                value={tenancyStartDate}
                onChange={(event) => setTenancyStartDate(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenancyStartDate?.[0]),
                )}
              />
              <FieldError message={state.fieldErrors?.tenancyStartDate?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Tenancy Duration
              </label>
              <select
                name="tenancyDuration"
                value={tenancyDuration}
                onChange={(event) => setTenancyDuration(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.tenancyDuration?.[0]),
                )}
              >
                <option value="6_months">6 months</option>
                <option value="1_year">1 year</option>
                <option value="2_years">2 years</option>
              </select>
              <FieldError message={state.fieldErrors?.tenancyDuration?.[0]} />
            </div>

            <div className="rounded-button bg-primary-soft p-4 md:col-span-2">
              <p className="text-sm font-bold text-primary">
                Calculated Tenancy End Date
              </p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {calculatedEndDate || "Select tenancy start date"}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                The generated agreement will use this period as the tenancy
                term.
              </p>
            </div>

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
                Rent Frequency
              </label>
              <select
                name="rentFrequency"
                defaultValue="annual"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.rentFrequency?.[0]),
                )}
              >
                <option value="annual">Annual</option>
                <option value="biannual">Every 6 months</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
              <FieldError message={state.fieldErrors?.rentFrequency?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Caution / Security Deposit
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
                Renewal Notice Days
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
            </div>
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <div>
            <p className="text-sm font-bold text-primary">Agreement clauses</p>
            <h2 className="mt-1 text-lg font-black text-text-strong">
              Property Requirements and Special Terms
            </h2>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
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
            </div>

            <div>
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
            <p className="text-sm font-bold text-primary">
              Free agreement preview
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-text-strong">
              Generate the agreement first. Create an account later.
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              BOPA prepares a tenancy agreement preview using the same structure
              as the landlord dashboard agreement workflow: parties, premises,
              tenancy term, rent clause, obligations, property requirements,
              digital record clause, and signature section.
            </p>

            <div className="mt-5 rounded-button bg-primary-soft p-4">
              <p className="text-sm font-black text-text-strong">
                What this creates now
              </p>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                A saved public agreement snapshot and on-screen agreement body
                preview. PDF download and account attachment come in the next
                batch.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
