"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { revokeCaretakerAccessAction } from "@/actions/caretaker.actions";
import { initialCaretakerRevokeActionState } from "@/actions/caretaker.state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LandlordCaretakerSummary } from "@/server/services/caretaker-invites.service";

type CaretakerListProps = {
  caretakers: LandlordCaretakerSummary[];
};

function RevokeSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      isLoading={pending}
      disabled={pending}
    >
      {label}
    </Button>
  );
}

function RevokeButton({
  caretakerProfileId,
  propertyId,
  label,
}: {
  caretakerProfileId: string;
  propertyId?: string;
  label: string;
}) {
  const [state, formAction] = useActionState(
    revokeCaretakerAccessAction,
    initialCaretakerRevokeActionState,
  );

  return (
    <form action={formAction}>
      <input
        type="hidden"
        name="caretakerProfileId"
        value={caretakerProfileId}
      />
      {propertyId ? (
        <input type="hidden" name="propertyId" value={propertyId} />
      ) : null}
      <RevokeSubmitButton label={label} />
      {state.message && !state.ok ? (
        <p className="mt-1 text-xs font-semibold text-danger">{state.message}</p>
      ) : null}
    </form>
  );
}

function CaretakerCard({ caretaker }: { caretaker: LandlordCaretakerSummary }) {
  const [expanded, setExpanded] = useState(false);
  const activeAssignments = caretaker.assignments.filter(
    (assignment) => assignment.isActive,
  );

  return (
    <article className="rounded-card border border-border-soft bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold text-text-strong">
            {caretaker.caretakerName}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {caretaker.caretakerPhone ?? "No phone on profile"}
          </p>
        </div>
        <Badge tone={caretaker.isActive ? "success" : "neutral"}>
          {caretaker.isActive ? "Active" : "Revoked"}
        </Badge>
      </div>

      <p className="mt-3 text-sm font-semibold text-text-muted">
        {activeAssignments.length > 0
          ? `${activeAssignments.length} assigned propert${activeAssignments.length === 1 ? "y" : "ies"}`
          : "No active property access"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide properties" : "View assigned properties"}
        </Button>

        {caretaker.isActive ? (
          <RevokeButton
            caretakerProfileId={caretaker.caretakerProfileId}
            label="Remove access"
          />
        ) : null}
      </div>

      {expanded ? (
        <ul className="mt-4 space-y-2 border-t border-border-soft pt-4">
          {caretaker.assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="flex items-center justify-between gap-3 rounded-button bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-strong">
                  {assignment.propertyName}
                </p>
                <p className="text-xs font-semibold text-text-muted">
                  {assignment.isActive ? "Active" : "Revoked"}
                </p>
              </div>

              {assignment.isActive ? (
                <RevokeButton
                  caretakerProfileId={caretaker.caretakerProfileId}
                  propertyId={assignment.propertyId}
                  label="Remove"
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function CaretakerList({ caretakers }: CaretakerListProps) {
  if (caretakers.length === 0) {
    return (
      <div className="rounded-card border border-border-soft bg-white p-4">
        <p className="text-sm font-semibold text-text-muted">
          No caretakers yet. Invite someone to help follow up rent on your
          properties.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {caretakers.map((caretaker) => (
        <CaretakerCard
          key={caretaker.caretakerProfileId}
          caretaker={caretaker}
        />
      ))}
    </div>
  );
}
