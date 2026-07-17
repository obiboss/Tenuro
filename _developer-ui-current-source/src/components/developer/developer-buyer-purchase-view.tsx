"use client";

import { initiateBuyerPurchasePaymentAction } from "@/actions/developer-buyer-purchase.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { formatNaira } from "@/lib/money/naira";
import type { getBuyerPurchaseByToken } from "@/server/services/developer-buyer-purchase.service";

type BuyerPurchaseData = NonNullable<
  Awaited<ReturnType<typeof getBuyerPurchaseByToken>>
>;

type DeveloperBuyerPurchaseViewProps = {
  data: BuyerPurchaseData;
  token: string;
};

export function DeveloperBuyerPurchaseView({
  data,
  token,
}: DeveloperBuyerPurchaseViewProps) {
  const { summary, prefilled } = data;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Plot you selected"
        description="Review the plot details chosen by the developer."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Estate</p>
            <p className="mt-2 text-base font-black text-text-strong">
              {summary.estateName}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {summary.estateLocation}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Plot number</p>
            <p className="mt-2 text-base font-black text-text-strong">
              {summary.plotNumber}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Plot size</p>
            <p className="mt-2 text-base font-black text-text-strong">
              {summary.plotSize}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Total price</p>
            <p className="mt-2 text-base font-black text-text-strong">
              {formatNaira(summary.totalPrice)}
            </p>
          </div>
        </div>
      </SectionCard>

      <form action={initiateBuyerPurchasePaymentAction} className="space-y-6">
        <input type="hidden" name="token" value={token} />

        <SectionCard
          title="Your details"
          description="Fill your details to continue with this plot purchase."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Full name"
              name="fullName"
              defaultValue={prefilled.fullName}
              required
            />

            <Input
              label="Phone number"
              name="phoneNumber"
              type="tel"
              defaultValue={prefilled.phoneNumber}
              required
            />
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={prefilled.email}
          />

          <Input label="Address" name="residentialAddress" required />

          <Input
            label="NIN"
            name="nin"
            inputMode="numeric"
            pattern="\d{11}"
            maxLength={11}
            required
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Input label="Next of kin name" name="nextOfKinName" required />

            <Input
              label="Next of kin phone"
              name="nextOfKinPhone"
              type="tel"
              required
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Payment plan"
          description="The developer has set the payment option and first payment for this plot."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Payment option</p>
              <p className="mt-2 text-base font-black text-text-strong">
                {summary.paymentPlanLabel}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">First payment</p>
              <p className="mt-2 text-base font-black text-text-strong">
                {formatNaira(summary.firstPaymentAmount)}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Total price</p>
              <p className="mt-2 text-base font-black text-text-strong">
                {formatNaira(summary.totalPrice)}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">
                Balance after first payment
              </p>
              <p className="mt-2 text-base font-black text-text-strong">
                {formatNaira(summary.balanceAfterFirstPayment)}
              </p>
            </div>
          </div>
        </SectionCard>

        <TrustNotice
          title="Before you pay"
          description="Your payment will be verified before your purchase record is updated. Original physical documents are issued by the developer after the required payment and handover process."
        />

        <Button type="submit" fullWidth>
          Continue to payment
        </Button>
      </form>
    </div>
  );
}
