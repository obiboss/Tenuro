import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildLandlordSubscriptionGateUiState } from "@/lib/landlord-subscription-gate";
import type { LandlordPlatformAccessReason } from "@/server/services/landlord-subscription-access.service";

type LandlordSubscriptionRequiredNoticeProps = {
  reason: Exclude<
    LandlordPlatformAccessReason,
    "active_subscription" | "trialing" | "legacy_grandfathered"
  >;
  compact?: boolean;
};

export function LandlordSubscriptionRequiredNotice({
  reason,
  compact = false,
}: LandlordSubscriptionRequiredNoticeProps) {
  const gate = buildLandlordSubscriptionGateUiState({ reason });

  if (compact) {
    return (
      <div
        role="alert"
        className={
          gate.tone === "warning"
            ? "rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning"
            : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
        }
      >
        {gate.description}{" "}
        <Link href={gate.settingsHref} className="underline">
          View BOPA plans
        </Link>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-card border border-warning/20 bg-linear-to-br from-warning-soft/70 to-white p-5 shadow-card"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning">
            <ShieldAlert aria-hidden="true" size={22} strokeWidth={2.6} />
          </div>

          <div>
            <p className="text-lg font-extrabold text-text-strong">
              {gate.title}
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
              {gate.description}
            </p>
          </div>
        </div>

        <Link href={gate.settingsHref}>
          <Button>View BOPA Plans</Button>
        </Link>
      </div>
    </div>
  );
}
