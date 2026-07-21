"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { submitDemoRequestAction } from "@/actions/demo-request.actions";
import { initialDemoRequestActionState } from "@/actions/demo-request.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BOPA_WHATSAPP_NUMBER,
  BOPA_WHATSAPP_NUMBER_DISPLAY,
} from "@/constants/bopa-contact";
import { buildWaMeUrl } from "@/lib/whatsapp";
import type { DemoWorkspaceType } from "@/server/validators/demo-request.schema";

const workspaceOptions = [
  {
    label: "BOPA Manager — for property management firms",
    value: "manager",
  },
  {
    label: "BOPA Developer — for real estate developers",
    value: "developer",
  },
];

const timeWindowOptions = [
  {
    label: "Morning — 9:00 AM to 12:00 PM WAT",
    value: "morning",
  },
  {
    label: "Afternoon — 12:00 PM to 4:00 PM WAT",
    value: "afternoon",
  },
  {
    label: "Evening — 4:00 PM to 6:00 PM WAT",
    value: "evening",
  },
];

function getFieldError(
  fieldErrors: Record<string, string[]> | undefined,
  field: string,
) {
  return fieldErrors?.[field]?.[0];
}

export function DemoRequestForm({
  defaultWorkspace,
  minimumDate,
}: {
  defaultWorkspace: DemoWorkspaceType;
  minimumDate: string;
}) {
  const [state, action, isPending] = useActionState(
    submitDemoRequestAction,
    initialDemoRequestActionState,
  );

  if (state.ok) {
    const workspaceLabel =
      defaultWorkspace === "manager" ? "BOPA Manager" : "BOPA Developer";
    const whatsappUrl = buildWaMeUrl({
      phoneNumber: BOPA_WHATSAPP_NUMBER,
      message: [
        "Hello BOPA,",
        "",
        `I have submitted a request for a ${workspaceLabel} demonstration${state.requestId ? ` (request ${state.requestId})` : ""}.`,
      ].join("\n"),
    });

    return (
      <div
        role="status"
        className="rounded-4xl border border-success/25 bg-success-soft p-6 shadow-card md:p-8"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white text-success shadow-soft">
          <CheckCircle2 aria-hidden="true" size={28} strokeWidth={2.6} />
        </div>

        <h2 className="mt-6 text-2xl font-black tracking-tight text-text-strong">
          Your demo request has been received
        </h2>

        <p className="mt-3 text-base font-semibold leading-7 text-text-normal">
          {state.message}
        </p>

        <p className="mt-3 text-sm leading-6 text-text-muted">
          Please keep an eye on the email address and phone number you provided.
          Your requested time is not confirmed until the BOPA team contacts you.
        </p>

        <p className="mt-3 text-sm font-semibold leading-6 text-text-normal">
          You may also send BOPA a WhatsApp message on{" "}
          {BOPA_WHATSAPP_NUMBER_DISPLAY}.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-success px-5 py-3 text-base font-bold text-white shadow-soft transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
          >
            <MessageCircle aria-hidden="true" size={18} strokeWidth={2.6} />
            WhatsApp BOPA
          </a>

          <Link
            href={defaultWorkspace === "manager" ? "/managers" : "/developers"}
            className="inline-flex min-h-12 items-center justify-center rounded-button bg-primary px-5 py-3 text-base font-bold text-white shadow-soft transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Return to BOPA{" "}
            {defaultWorkspace === "manager" ? "Manager" : "Developer"}
          </Link>

        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <Select
        label="What would you like to see?"
        name="workspaceType"
        options={workspaceOptions}
        defaultValue={defaultWorkspace}
        error={getFieldError(state.fieldErrors, "workspaceType")}
        required
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Full name"
          name="fullName"
          autoComplete="name"
          placeholder="Your full name"
          error={getFieldError(state.fieldErrors, "fullName")}
          required
        />

        <Input
          label="Company or business name"
          name="companyName"
          autoComplete="organization"
          placeholder="Your company name"
          error={getFieldError(state.fieldErrors, "companyName")}
          required
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Work email"
          name="workEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@company.com"
          error={getFieldError(state.fieldErrors, "workEmail")}
          required
        />

        <Input
          label="WhatsApp or phone number"
          name="phoneNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08012345678"
          helperText="Use a Nigerian number where the BOPA team can reach you."
          error={getFieldError(state.fieldErrors, "phoneNumber")}
          required
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Preferred demo date"
          name="preferredDate"
          type="date"
          min={minimumDate}
          error={getFieldError(state.fieldErrors, "preferredDate")}
          required
        />

        <Select
          label="Preferred time"
          name="preferredTimeWindow"
          options={timeWindowOptions}
          error={getFieldError(state.fieldErrors, "preferredTimeWindow")}
          required
        />
      </div>

      <Textarea
        label="What would you like us to focus on?"
        name="message"
        rows={4}
        maxLength={1_000}
        placeholder="Optional — tell us about your properties, estates, team, or the main problem you want BOPA to solve."
        helperText="Optional. This helps us prepare a more useful demonstration."
        error={getFieldError(state.fieldErrors, "message")}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor="demo-request-website">Website</label>
        <input
          id="demo-request-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <p className="text-sm leading-6 text-text-muted">
        By submitting this request, you agree that BOPA may contact you about
        the demonstration. Your preferred time will be confirmed with you.
      </p>

      <Button type="submit" fullWidth disabled={isPending}>
        <Send aria-hidden="true" size={18} strokeWidth={2.6} />
        {isPending ? "Sending your request..." : "Request My Demo"}
      </Button>
    </form>
  );
}
