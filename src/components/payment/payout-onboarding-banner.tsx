"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { dismissPayoutOnboardingBannerAction } from "@/actions/landlord-onboarding.actions";
import { Button } from "@/components/ui/button";
import { LANDLORD_PAYOUT_SETTINGS_PATH } from "@/lib/landlord-payout";

type PayoutOnboardingBannerProps = {
  initialVisible: boolean;
};

export function PayoutOnboardingBanner({
  initialVisible,
}: PayoutOnboardingBannerProps) {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [isPending, startTransition] = useTransition();

  if (!isVisible) {
    return null;
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissPayoutOnboardingBannerAction();
      setIsVisible(false);
    });
  }

  return (
    <div className="mb-6 rounded-card border border-primary/15 bg-linear-to-br from-primary-soft to-white p-5 shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
            <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
          </div>

          <div className="min-w-0">
            <p className="text-lg font-extrabold text-text-strong">
              Connect your payout bank account
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-text-muted">
              BOPA needs a verified payout account before you can send online
              rent payment links. Tenants pay through Paystack, and your rent is
              settled directly to the bank account you connect here.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Link href={LANDLORD_PAYOUT_SETTINGS_PATH}>
            <Button fullWidth>Add bank account</Button>
          </Link>

          <Button
            type="button"
            variant="ghost"
            fullWidth
            disabled={isPending}
            onClick={handleDismiss}
          >
            Dismiss for now
          </Button>
        </div>
      </div>
    </div>
  );
}
