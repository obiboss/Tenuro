"use client";

import { useActionState } from "react";
import {
  initialTenantListingApplicationActionState,
  type TenantListingApplicationActionState,
} from "@/actions/tenant-listing-applications.state";
import { submitTenantListingApplicationAction } from "@/actions/tenant-listing-applications.actions";

function FieldError({
  field,
  state,
}: {
  field: string;
  state: TenantListingApplicationActionState;
}) {
  const message = state.fieldErrors?.[field]?.[0];

  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-semibold text-danger">{message}</p>;
}

export function TenantListingApplicationForm({
  listingId,
}: {
  listingId: string;
}) {
  const [state, action, isPending] = useActionState(
    submitTenantListingApplicationAction,
    initialTenantListingApplicationActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <input
        type="hidden"
        name="agentPropertyListingId"
        value={listingId}
        readOnly
      />

      {state.message ? (
        <div
          role="alert"
          className={`rounded-button px-4 py-3 text-sm font-semibold leading-6 ${
            state.ok
              ? state.requiresProcessingFee
                ? "bg-warning-soft text-warning"
                : "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="fullName"
          className="text-sm font-bold text-text-strong"
        >
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
          required
        />
        <FieldError field="fullName" state={state} />
      </div>

      <div>
        <label
          htmlFor="phoneNumber"
          className="text-sm font-bold text-text-strong"
        >
          Phone number
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          placeholder="+234..."
          className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
          required
        />
        <FieldError field="phoneNumber" state={state} />
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-bold text-text-strong">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
        />
        <FieldError field="email" state={state} />
      </div>

      <div>
        <label
          htmlFor="dateOfBirth"
          className="text-sm font-bold text-text-strong"
        >
          Date of birth
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
        />
        <FieldError field="dateOfBirth" state={state} />
      </div>

      <div>
        <label
          htmlFor="homeAddress"
          className="text-sm font-bold text-text-strong"
        >
          Current home address
        </label>
        <textarea
          id="homeAddress"
          name="homeAddress"
          rows={3}
          className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
          required
        />
        <FieldError field="homeAddress" state={state} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="occupation"
            className="text-sm font-bold text-text-strong"
          >
            Occupation
          </label>
          <input
            id="occupation"
            name="occupation"
            type="text"
            className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
            required
          />
          <FieldError field="occupation" state={state} />
        </div>

        <div>
          <label
            htmlFor="employer"
            className="text-sm font-bold text-text-strong"
          >
            Employer / business name
          </label>
          <input
            id="employer"
            name="employer"
            type="text"
            className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
          />
          <FieldError field="employer" state={state} />
        </div>
      </div>

      <div>
        <label htmlFor="idType" className="text-sm font-bold text-text-strong">
          ID type
        </label>
        <select
          id="idType"
          name="idType"
          className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
        >
          <option value="">Select ID type</option>
          <option value="nin">NIN</option>
          <option value="passport">Passport</option>
          <option value="drivers_license">Driver&apos;s license</option>
          <option value="voters_card">Voter&apos;s card</option>
        </select>
        <FieldError field="idType" state={state} />
      </div>

      <div>
        <label
          htmlFor="canProvideGuarantor"
          className="text-sm font-bold text-text-strong"
        >
          Can you provide guarantor details if required?
        </label>
        <select
          id="canProvideGuarantor"
          name="canProvideGuarantor"
          className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
          required
        >
          <option value="">Select answer</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="not_sure">Not sure</option>
        </select>
        <FieldError field="canProvideGuarantor" state={state} />
      </div>

      <div className="rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
        Processing and verification fee is not a guarantee that the apartment
        will be given to you. Final approval depends on landlord review,
        property availability, and verification outcome.
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-button bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Submitting application..." : "Submit application"}
      </button>
    </form>
  );
}
