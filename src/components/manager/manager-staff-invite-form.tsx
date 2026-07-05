"use client";

import { useActionState } from "react";
import { createManagerStaffInviteAction } from "@/actions/manager-staff.actions";
import { initialManagerActionState } from "@/actions/manager.state";

export function ManagerStaffInviteForm() {
  const [state, formAction, isPending] = useActionState(
    createManagerStaffInviteAction,
    initialManagerActionState,
  );

  return (
    <form
      action={formAction}
      className="rounded-card border border-border-soft bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-black tracking-tight text-text-strong">
        Invite staff
      </h2>

      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
        Choose one role. BOPA will apply the right access automatically.
      </p>

      {state.message ? (
        <div
          role="alert"
          className={
            state.ok
              ? "mt-4 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "mt-4 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <label
            className="text-sm font-bold text-text-strong"
            htmlFor="staffName"
          >
            Staff name
          </label>
          <input
            id="staffName"
            name="staffName"
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            required
          />
          {state.fieldErrors?.staffName?.[0] ? (
            <p className="text-sm font-semibold text-danger">
              {state.fieldErrors.staffName[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-bold text-text-strong"
            htmlFor="staffEmail"
          >
            Staff email
          </label>
          <input
            id="staffEmail"
            name="staffEmail"
            type="email"
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            required
          />
          {state.fieldErrors?.staffEmail?.[0] ? (
            <p className="text-sm font-semibold text-danger">
              {state.fieldErrors.staffEmail[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-bold text-text-strong"
            htmlFor="staffRole"
          >
            Staff role
          </label>
          <select
            id="staffRole"
            name="staffRole"
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            required
          >
            <option value="manager">Manager</option>
            <option value="accountant">Accountant</option>
            <option value="property_officer">Property Officer</option>
            <option value="maintenance_officer">Maintenance Officer</option>
          </select>
          {state.fieldErrors?.staffRole?.[0] ? (
            <p className="text-sm font-semibold text-danger">
              {state.fieldErrors.staffRole[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-text-strong" htmlFor="note">
            Note
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            placeholder="Optional"
          />
          {state.fieldErrors?.note?.[0] ? (
            <p className="text-sm font-semibold text-danger">
              {state.fieldErrors.note[0]}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 min-h-12 w-full rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating invite..." : "Create Invite"}
      </button>
    </form>
  );
}
