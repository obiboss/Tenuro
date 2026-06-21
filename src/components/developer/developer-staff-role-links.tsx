"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createDeveloperStaffRoleLinkAction } from "@/actions/developer-staff.actions";
import { initialDeveloperStaffRoleLinkActionState } from "@/actions/developer-staff.state";
import {
  DEVELOPER_STAFF_TITLE_OPTIONS,
  getDeveloperStaffTitleLabel,
  type DeveloperStaffTitle,
} from "@/constants/developer-staff-permissions";
import { Button } from "@/components/ui/button";

type DeveloperStaffRoleLinksProps = {
  acceptedCountsByTitle: Partial<Record<DeveloperStaffTitle, number>>;
};

function GenerateRoleLinkButton({ title }: { title: DeveloperStaffTitle }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" isLoading={pending} disabled={pending}>
      Generate {getDeveloperStaffTitleLabel(title)} Link
    </Button>
  );
}

export function DeveloperStaffRoleLinks({
  acceptedCountsByTitle,
}: DeveloperStaffRoleLinksProps) {
  const [state, formAction] = useActionState(
    createDeveloperStaffRoleLinkAction,
    initialDeveloperStaffRoleLinkActionState,
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-5 shadow-soft">
      <div className="rounded-card bg-primary-soft p-5">
        <p className="font-black text-text-strong">Staff onboarding links</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Generate a role link and send it to the staff member. The staff fills
          their own details and creates their own password.
        </p>
      </div>

      {state.message ? (
        <div
          role="alert"
          className={
            state.ok
              ? "mt-5 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "mt-5 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          {state.message}
        </div>
      ) : null}

      {state.onboardingUrl ? (
        <div className="mt-5 rounded-card border border-primary/20 bg-primary-soft p-4">
          <p className="text-sm font-black text-text-strong">
            {state.staffTitleLabel ?? "Staff"} link
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Copy this link and send it by WhatsApp, SMS, or email. It expires in
            30 days.
          </p>
          <input
            readOnly
            value={state.onboardingUrl}
            className="mt-3 min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-bold text-text-strong outline-none"
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {DEVELOPER_STAFF_TITLE_OPTIONS.map((option) => (
          <form
            key={option.value}
            action={formAction}
            className="rounded-card border border-border-soft bg-background p-4"
          >
            <input type="hidden" name="staffTitle" value={option.value} />

            <div>
              <p className="font-black text-text-strong">{option.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                {option.description}
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-text-muted">
                Joined through this role:{" "}
                {acceptedCountsByTitle[option.value] ?? 0}
              </p>
            </div>

            <div className="mt-4">
              <GenerateRoleLinkButton title={option.value} />
            </div>
          </form>
        ))}
      </div>
    </section>
  );
}
