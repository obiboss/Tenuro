"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  acceptCaretakerInviteAction,
  acceptCaretakerInviteSignupAction,
} from "@/actions/caretaker.actions";
import { initialCaretakerAcceptActionState } from "@/actions/caretaker.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type CaretakerInviteAcceptancePanelProps = {
  token: string;
  caretakerName: string;
  caretakerPhone: string;
  landlordName: string;
  propertyNames: string[];
  canAcceptNow: boolean;
  roleConflict: string | null;
  isLoggedIn: boolean;
};

function AcceptInviteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" isLoading={pending} disabled={pending} fullWidth>
      Accept invite
    </Button>
  );
}

function CreateAccountButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" isLoading={pending} disabled={pending} fullWidth>
      Create caretaker account
    </Button>
  );
}

export function CaretakerInviteAcceptancePanel({
  token,
  caretakerName,
  caretakerPhone,
  landlordName,
  propertyNames,
  canAcceptNow,
  roleConflict,
  isLoggedIn,
}: CaretakerInviteAcceptancePanelProps) {
  const [acceptState, acceptAction] = useActionState(
    acceptCaretakerInviteAction,
    initialCaretakerAcceptActionState,
  );
  const [signupState, signupAction] = useActionState(
    acceptCaretakerInviteSignupAction,
    initialCaretakerAcceptActionState,
  );

  return (
    <div className="space-y-4 rounded-card border border-border-soft bg-white p-4 shadow-card">
      <div>
        <p className="text-sm font-semibold text-text-muted">Invited by</p>
        <p className="text-lg font-black text-text-strong">{landlordName}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Caretaker
          </p>
          <p className="mt-1 text-sm font-extrabold text-text-strong">
            {caretakerName}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Phone
          </p>
          <p className="mt-1 text-sm font-extrabold text-text-strong">
            {caretakerPhone}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
          Assigned properties
        </p>
        <ul className="mt-2 space-y-1">
          {propertyNames.map((propertyName) => (
            <li
              key={propertyName}
              className="text-sm font-semibold text-text-strong"
            >
              {propertyName}
            </li>
          ))}
        </ul>
      </div>

      {roleConflict ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {roleConflict}
        </div>
      ) : null}

      {canAcceptNow ? (
        <form action={acceptAction}>
          <input type="hidden" name="token" value={token} />
          {acceptState.message && !acceptState.ok ? (
            <div className="mb-3 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {acceptState.message}
            </div>
          ) : null}
          <AcceptInviteButton />
        </form>
      ) : null}

      {!isLoggedIn && !roleConflict ? (
        <form action={signupAction} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm font-semibold text-text-muted">
            Create your caretaker password to continue.
          </p>
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={signupState.fieldErrors?.password?.[0]}
            required
          />
          {signupState.message && !signupState.ok ? (
            <div className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {signupState.message}
            </div>
          ) : null}
          <CreateAccountButton />
        </form>
      ) : null}

      {!isLoggedIn ? (
        <p className="text-center text-sm text-text-muted">
          Already have a caretaker account?{" "}
          <Link
            href="/login"
            className={cn("font-bold text-primary")}
          >
            Sign in
          </Link>{" "}
          and open this invite link again.
        </p>
      ) : null}
    </div>
  );
}
