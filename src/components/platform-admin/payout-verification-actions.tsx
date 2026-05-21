"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  failPayoutAccountAction,
  type PlatformAdminPayoutVerificationActionState,
  verifyPayoutAccountAction,
} from "@/actions/platform-admin-payout-verification.actions";
import { Button } from "@/components/ui/button";
import type { PayoutVerificationAccountType } from "@/server/services/platform-admin-payout-verification.service";
import type { PaystackVerificationStatus } from "@/server/types/paystack.types";

type PayoutVerificationActionsProps = {
  accountType: PayoutVerificationAccountType;
  accountId: string;
  expectedUpdatedAt: string;
  verificationStatus: PaystackVerificationStatus;
  isActive: boolean;
};

const initialState: PlatformAdminPayoutVerificationActionState = {
  ok: false,
  message: "",
};

function HiddenAccountFields({
  accountType,
  accountId,
  expectedUpdatedAt,
}: {
  accountType: PayoutVerificationAccountType;
  accountId: string;
  expectedUpdatedAt: string;
}) {
  return (
    <>
      <input type="hidden" name="accountType" value={accountType} />
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
    </>
  );
}

function shouldShowPayoutVerificationActions(
  verificationStatus: PaystackVerificationStatus,
  isActive: boolean,
) {
  if (!isActive) {
    return false;
  }

  return (
    verificationStatus === "unverified" || verificationStatus === "failed"
  );
}

export function PayoutVerificationActions({
  accountType,
  accountId,
  expectedUpdatedAt,
  verificationStatus,
  isActive,
}: PayoutVerificationActionsProps) {
  const [verifyState, verifyFormAction, isVerifying] = useActionState(
    verifyPayoutAccountAction,
    initialState,
  );
  const [failState, failFormAction, isFailing] = useActionState(
    failPayoutAccountAction,
    initialState,
  );

  const isBusy = isVerifying || isFailing;
  const showActions = shouldShowPayoutVerificationActions(
    verificationStatus,
    isActive,
  );
  const showFailAction = verificationStatus === "unverified";
  const latestMessage = verifyState.message || failState.message;
  const latestState = verifyState.message ? verifyState : failState;
  const router = useRouter();

  useEffect(() => {
    if (!latestState.ok || !latestState.message) {
      return;
    }

    router.refresh();
  }, [latestState.ok, latestState.message, router]);

  if (!showActions) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        <form action={verifyFormAction} className="min-w-0 flex-1">
          <HiddenAccountFields
            accountType={accountType}
            accountId={accountId}
            expectedUpdatedAt={expectedUpdatedAt}
          />
          <Button
            type="submit"
            size="sm"
            fullWidth
            disabled={isBusy}
            isLoading={isVerifying}
          >
            Verify
          </Button>
        </form>

        {showFailAction ? (
          <form action={failFormAction} className="min-w-0 flex-1">
            <HiddenAccountFields
              accountType={accountType}
              accountId={accountId}
              expectedUpdatedAt={expectedUpdatedAt}
            />
            <Button
              type="submit"
              size="sm"
              variant="danger"
              fullWidth
              disabled={isBusy}
              isLoading={isFailing}
            >
              Mark Failed
            </Button>
          </form>
        ) : null}
      </div>

      {latestMessage ? (
        <p
          className={
            latestState.ok
              ? "text-xs font-semibold leading-5 text-success"
              : "text-xs font-semibold leading-5 text-danger"
          }
        >
          {latestMessage}
        </p>
      ) : null}
    </div>
  );
}
