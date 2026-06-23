"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { CaretakerInviteForm } from "@/components/caretaker/caretaker-invite-form";
import { CaretakerList } from "@/components/caretaker/caretaker-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { LandlordCaretakerSummary } from "@/server/services/caretaker-invites.service";
import type { CaretakerInviteRow } from "@/server/repositories/caretaker-invites.repository";

type CaretakersPageClientProps = {
  caretakers: LandlordCaretakerSummary[];
  pendingInvites: CaretakerInviteRow[];
  properties: Array<{ id: string; name: string }>;
};

export function CaretakersPageClient({
  caretakers,
  pendingInvites,
  properties,
}: CaretakersPageClientProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Caretakers"
        description="Invite caretakers to help follow up rent on specific properties."
        action={
          <Button
            type="button"
            onClick={() => setShowInviteForm((value) => !value)}
          >
            <UserPlus aria-hidden="true" size={16} strokeWidth={2.6} />
            Invite caretaker
          </Button>
        }
      />

      {showInviteForm ? (
        <CaretakerInviteForm
          properties={properties}
          onClose={() => setShowInviteForm(false)}
        />
      ) : null}

      {pendingInvites.length > 0 ? (
        <div className="rounded-card border border-border-soft bg-white p-4">
          <p className="text-sm font-extrabold text-text-strong">
            Pending invites
          </p>
          <ul className="mt-3 space-y-2">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="rounded-button bg-background px-3 py-2 text-sm"
              >
                <span className="font-bold text-text-strong">
                  {invite.caretaker_name}
                </span>
                <span className="text-text-muted">
                  {" "}
                  · {invite.property_ids.length} propert
                  {invite.property_ids.length === 1 ? "y" : "ies"} · waiting
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <CaretakerList caretakers={caretakers} />
    </div>
  );
}
