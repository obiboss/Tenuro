"use client";

import { useMemo, useState, useActionState } from "react";
import { generatePublicReceiptAction } from "@/actions/public-receipt-generator.actions";
import { initialPublicReceiptGeneratorState } from "@/actions/public-receipt-generator.state";
import { GeneratedReceiptResult } from "@/components/public-tools/generated-receipt-result";
import { FreeToolAccountPrompt } from "@/components/public-tools/free-tool-account-prompt";
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
    "min-h-12 w-full rounded-button border bg-white px-4 py-3 text-base text-text-strong outline-none transition",
    hasError
      ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger-soft"
      : "border-border-soft focus:border-primary focus:ring-2 focus:ring-primary-soft",
  ].join(" ");
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

  const calculatedEndDate = useMemo(
    () => calculateEndDate(rentStartDate, rentDuration),
    [rentStartDate, rentDuration],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="sourcePath" value={sourcePath} />
        <input
          type="hidden"
          name="sourceLocation"
          value={sourceLocation ?? ""}
        />

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
                Block / Flat / Unit Number
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

            <div className="md:col-span-2">
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
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 shadow-card md:p-6">
          <h2 className="text-lg font-black text-text-strong">
            Payment Information
          </h2>

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
                Payment Date
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
                Rent Start Date
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
              <label className="text-sm font-bold text-text-strong">
                Rent Duration
              </label>
              <select
                name="rentDuration"
                value={rentDuration}
                onChange={(event) => setRentDuration(event.target.value)}
                className={fieldClassName(
                  Boolean(state.fieldErrors?.rentDuration?.[0]),
                )}
              >
                <option value="6_months">6 months</option>
                <option value="1_year">1 year</option>
                <option value="2_years">2 years</option>
              </select>
              <FieldError message={state.fieldErrors?.rentDuration?.[0]} />
            </div>

            <div>
              <label className="text-sm font-bold text-text-strong">
                Payment Method
              </label>
              <select
                name="paymentMethod"
                className={fieldClassName(
                  Boolean(state.fieldErrors?.paymentMethod?.[0]),
                )}
                defaultValue="bank_transfer"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="paystack_gateway">Paystack</option>
                <option value="other">Other</option>
              </select>
              <FieldError message={state.fieldErrors?.paymentMethod?.[0]} />
            </div>

            <div className="rounded-button bg-primary-soft p-4">
              <p className="text-sm font-bold text-primary">
                Calculated End Date
              </p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {calculatedEndDate || "Select rent start date"}
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
              {isPending ? "Generating Receipt..." : "Generate Receipt"}
            </Button>
          </div>
        </section>
      </form>

      <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
        {state.ok && state.receipt ? (
          <>
            <GeneratedReceiptResult receipt={state.receipt} />
            <FreeToolAccountPrompt claimUrl={state.receipt.claimUrl} />
          </>
        ) : (
          <div className="rounded-card bg-surface p-5 shadow-card md:p-6">
            <p className="text-sm font-bold text-primary">Free public tool</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-text-strong">
              Generate a rent receipt before signing up.
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              BOPA gives Nigerian landlords a fast way to prepare clean rent
              receipts. Free receipts include a subtle footer watermark.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
