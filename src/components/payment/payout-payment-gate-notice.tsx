"use client";

import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";
import type { LandlordPaymentGateUiState } from "@/lib/landlord-payment-gate";
import { LANDLORD_PAYOUT_SETTINGS_PATH } from "@/lib/landlord-payout";

type PayoutPaymentGateNoticeProps = {
  gate: LandlordPaymentGateUiState;
};

const toneClasses: Record<
  LandlordPaymentGateUiState["tone"],
  string | undefined
> = {
  neutral: undefined,
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function PayoutPaymentGateNotice({ gate }: PayoutPaymentGateNoticeProps) {
  return (
    <div className="space-y-4">
      <TrustNotice
        title={gate.title}
        description={gate.description}
        icon={<ReceiptText aria-hidden="true" size={22} strokeWidth={2.6} />}
        className={toneClasses[gate.tone]}
      />

      {gate.showAddBankCta ? (
        <Link href={LANDLORD_PAYOUT_SETTINGS_PATH}>
          <Button>Add bank account</Button>
        </Link>
      ) : null}

      {gate.showUpdateBankCta ? (
        <Link href={LANDLORD_PAYOUT_SETTINGS_PATH}>
          <Button>Update bank account</Button>
        </Link>
      ) : null}
    </div>
  );
}
