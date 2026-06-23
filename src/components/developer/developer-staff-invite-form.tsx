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
import { Card, CardContent } from "@/components/ui/card";
import { WhatsAppShareActions } from "@/components/ui/whatsapp-share-actions";

function GenerateRoleLinkButton({ title }: { title: DeveloperStaffTitle }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" isLoading={pending} disabled={pending}>
      Generate {getDeveloperStaffTitleLabel(title)} Link
    </Button>
  );
}

export function DeveloperStaffInviteForm() {
  const [state, formAction] = useActionState(
    createDeveloperStaffRoleLinkAction,
    initialDeveloperStaffRoleLinkActionState,
  );

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="rounded-card bg-primary-soft p-5">
          <p className="font-black text-text-strong">Staff onboarding links</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            Generate a role link and send it to the staff member. The staff
            fills their own details and creates their own password.
          </p>
        </div>

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

        {state.onboardingUrl ? (
          <div className="rounded-card border border-primary/20 bg-primary-soft p-4">
            <p className="text-sm font-black text-text-strong">
              {state.staffTitleLabel ?? "Staff"} onboarding link
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Copy this link and send it by WhatsApp, SMS, or email. It expires
              in 30 days.
            </p>
            <input
              readOnly
              value={state.onboardingUrl}
              className="mt-3 min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-bold text-text-strong outline-none"
            />
            <div className="mt-3">
              <WhatsAppShareActions
                message={`Join our team on BOPA using this secure staff link: ${state.onboardingUrl}`}
                copyText={state.onboardingUrl}
                whatsappLabel="Send on WhatsApp"
                copyLabel="Copy link"
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {DEVELOPER_STAFF_TITLE_OPTIONS.map((option) => (
            <form
              key={option.value}
              action={formAction}
              className="rounded-card border border-border-soft bg-background p-4"
            >
              <input type="hidden" name="staffTitle" value={option.value} />

              <p className="font-black text-text-strong">{option.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                {option.description}
              </p>

              <div className="mt-4">
                <GenerateRoleLinkButton title={option.value} />
              </div>
            </form>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
