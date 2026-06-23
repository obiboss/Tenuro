"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCaretakerInviteAction } from "@/actions/caretaker.actions";
import { initialCaretakerInviteActionState } from "@/actions/caretaker.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhatsAppShareActions } from "@/components/ui/whatsapp-share-actions";
import { cn } from "@/lib/cn";

type CaretakerInviteFormProps = {
  properties: Array<{
    id: string;
    name: string;
  }>;
  onClose?: () => void;
};

function SubmitInviteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" isLoading={pending} disabled={pending}>
      Send WhatsApp invite
    </Button>
  );
}

export function CaretakerInviteForm({
  properties,
  onClose,
}: CaretakerInviteFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [state, formAction] = useActionState(
    createCaretakerInviteAction,
    initialCaretakerInviteActionState,
  );

  if (properties.length === 0) {
    return (
      <div className="rounded-card border border-border-soft bg-white p-4 text-sm font-semibold text-text-muted">
        Add a property before inviting a caretaker.
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border-soft bg-white p-4 shadow-card">
      <p className="text-base font-extrabold text-text-strong">Invite caretaker</p>
      <p className="mt-1 text-sm text-text-muted">
        Enter details and select the properties they should help with.
      </p>

      {state.message ? (
        <div
          role="alert"
          className={cn(
            "mt-4 rounded-button px-4 py-3 text-sm font-semibold",
            state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
          )}
        >
          {state.message}
        </div>
      ) : null}

      {state.inviteUrl && state.whatsappMessage ? (
        <div className="mt-4 rounded-card border border-primary/20 bg-primary-soft p-4">
          <p className="text-sm font-black text-text-strong">Invite ready</p>
          <input
            readOnly
            value={state.inviteUrl}
            className="mt-3 min-h-11 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-bold text-text-strong outline-none"
          />
          <div className="mt-3">
            <WhatsAppShareActions
              phoneNumber={state.caretakerPhone}
              message={state.whatsappMessage}
              copyText={state.inviteUrl}
              whatsappLabel="Send on WhatsApp"
              copyLabel="Copy invite link"
            />
          </div>
        </div>
      ) : (
        <form action={formAction} className="mt-4 space-y-4">
          <Input
            label="Caretaker name"
            name="caretakerName"
            placeholder="Full name"
            error={state.fieldErrors?.caretakerName?.[0]}
            required
          />

          <PhoneNumberInput
            label="Caretaker phone number"
            name="caretakerPhone"
            value={phoneNumber}
            onChange={setPhoneNumber}
            error={state.fieldErrors?.caretakerPhone?.[0]}
            helperText="Used for direct WhatsApp invite."
            required
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-extrabold text-text-strong">
              Assigned properties
            </legend>
            {state.fieldErrors?.propertyIds?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.propertyIds[0]}
              </p>
            ) : null}
            <div className="space-y-2">
              {properties.map((property) => (
                <label
                  key={property.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-button border border-border-soft bg-background px-3 py-2"
                >
                  <input
                    type="checkbox"
                    name="propertyIds"
                    value={property.id}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm font-bold text-text-strong">
                    {property.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Input
            label="Optional note"
            name="note"
            placeholder="Any note for your records"
          />

          <div className="flex flex-wrap gap-2">
            <SubmitInviteButton />
            {onClose ? (
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
