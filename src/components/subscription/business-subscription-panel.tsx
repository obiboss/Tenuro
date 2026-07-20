"use client";

import { useActionState, useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import {
  initialBusinessSubscriptionActionState,
  initializeBusinessSubscriptionAction,
  manageBusinessSubscriptionAction,
} from "@/actions/subscription.actions";
import {
  BUSINESS_SUBSCRIPTION_ANNUAL_SAVING_NAIRA,
  BUSINESS_SUBSCRIPTION_PRICES,
  type BusinessBillingInterval,
  type BusinessWorkspaceType,
} from "@/constants/business-subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BusinessSubscriptionPanelProps = {
  workspaceType: BusinessWorkspaceType;
  businessName: string;
  isOwner: boolean;
  hasAccess: boolean;
  status: "trialing" | "active" | "past_due" | "expired" | "cancelled";
  trialExpiresAt: string;
  trialDaysRemaining: number;
  currentPeriodEnd: string | null;
  billingInterval: BusinessBillingInterval | null;
  defaultBillingEmail: string;
  hasPaystackSubscription: boolean;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(value));
}

function useSecureRedirect(redirectUrl: string | undefined) {
  useEffect(() => {
    if (redirectUrl) {
      window.location.assign(redirectUrl);
    }
  }, [redirectUrl]);
}

export function BusinessSubscriptionPanel({
  workspaceType,
  businessName,
  isOwner,
  hasAccess,
  status,
  trialExpiresAt,
  trialDaysRemaining,
  currentPeriodEnd,
  billingInterval,
  defaultBillingEmail,
  hasPaystackSubscription,
}: BusinessSubscriptionPanelProps) {
  const [selectedInterval, setSelectedInterval] =
    useState<BusinessBillingInterval>("monthly");
  const [checkoutState, checkoutAction, isCheckingOut] = useActionState(
    initializeBusinessSubscriptionAction,
    initialBusinessSubscriptionActionState,
  );
  const [manageState, manageAction, isOpeningBilling] = useActionState(
    manageBusinessSubscriptionAction,
    initialBusinessSubscriptionActionState,
  );

  useSecureRedirect(checkoutState.redirectUrl);
  useSecureRedirect(manageState.redirectUrl);

  const isPaidPeriod =
    (status === "active" || status === "cancelled") && hasAccess;
  const showCheckout =
    isOwner && !isPaidPeriod && !(status === "trialing" && hasAccess);

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-border-soft bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-primary">
              Company subscription
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-strong md:text-3xl">
              {businessName}
            </h1>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
              hasAccess
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger"
            }`}
          >
            {hasAccess ? (
              <CheckCircle2 aria-hidden="true" size={18} strokeWidth={2.7} />
            ) : (
              <CalendarClock aria-hidden="true" size={18} strokeWidth={2.7} />
            )}
            {status === "trialing" && hasAccess
              ? "Free period active"
              : isPaidPeriod
                ? "Subscription active"
                : status === "past_due"
                  ? "Payment required"
                  : "Subscription required"}
          </div>
        </div>

        {status === "trialing" && hasAccess ? (
          <div className="mt-6 rounded-card bg-primary-soft p-5">
            <p className="font-black text-text-strong">
              {trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} left
              in your free period
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              Your two-month free period ends on {formatDate(trialExpiresAt)}.
              When it ends, choose a plan to keep your company workspace
              available.
            </p>
          </div>
        ) : null}

        {isPaidPeriod ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-card bg-background p-5">
              <p className="text-sm font-bold text-text-muted">Current plan</p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {billingInterval === "annual" ? "Yearly" : "Monthly"}
              </p>
            </div>
            <div className="rounded-card bg-background p-5">
              <p className="text-sm font-bold text-text-muted">
                {status === "cancelled" ? "Available until" : "Renews on"}
              </p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {formatDate(currentPeriodEnd)}
              </p>
            </div>
          </div>
        ) : null}

        {!hasAccess ? (
          <div className="mt-6 rounded-card bg-danger-soft p-5">
            <p className="font-black text-danger">
              Your company records are safe.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              Subscribe to reopen the workspace and continue managing your
              records.
            </p>
          </div>
        ) : null}
      </section>

      {!isOwner && !hasAccess ? (
        <section className="rounded-card border border-border-soft bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-strong">
                Ask your company owner to renew
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                One subscription covers the owner and authorised staff. Only the
                company owner can complete payment.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {showCheckout ? (
        <form
          action={checkoutAction}
          className="rounded-card border border-border-soft bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="workspaceType" value={workspaceType} />
          <input
            type="hidden"
            name="billingInterval"
            value={selectedInterval}
          />

          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-strong">
                Choose your billing plan
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                Payment renews automatically through Paystack until you cancel.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(
              Object.keys(
                BUSINESS_SUBSCRIPTION_PRICES,
              ) as BusinessBillingInterval[]
            ).map((interval) => {
              const price = BUSINESS_SUBSCRIPTION_PRICES[interval];
              const isSelected = selectedInterval === interval;

              return (
                <button
                  key={interval}
                  type="button"
                  onClick={() => setSelectedInterval(interval)}
                  className={`rounded-card border p-5 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary-soft ring-2 ring-primary-soft"
                      : "border-border-soft bg-background hover:border-primary"
                  }`}
                  aria-pressed={isSelected}
                >
                  <p className="font-black text-text-strong">{price.label}</p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {formatNaira(price.amountNaira)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {interval === "annual"
                      ? `Save ${formatNaira(BUSINESS_SUBSCRIPTION_ANNUAL_SAVING_NAIRA)} each year`
                      : "Billed every month"}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <Input
              label="Billing email"
              name="billingEmail"
              type="email"
              defaultValue={defaultBillingEmail}
              placeholder="accounts@company.com"
              error={checkoutState.fieldErrors?.billingEmail?.[0]}
              required
            />
          </div>

          {checkoutState.message ? (
            <p
              role="alert"
              className={`mt-4 rounded-button px-4 py-3 text-sm font-semibold ${
                checkoutState.ok
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {checkoutState.message}
            </p>
          ) : null}

          <div className="mt-6">
            <Button type="submit" isLoading={isCheckingOut} fullWidth>
              Continue to secure payment
            </Button>
          </div>
        </form>
      ) : null}

      {isOwner && isPaidPeriod && hasPaystackSubscription ? (
        <form
          action={manageAction}
          className="rounded-card border border-border-soft bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="workspaceType" value={workspaceType} />
          <h2 className="text-lg font-black text-text-strong">
            Manage billing
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            Update your payment method or stop automatic renewal in Paystack’s
            secure billing page.
          </p>

          {manageState.message ? (
            <p
              role="alert"
              className={`mt-4 rounded-button px-4 py-3 text-sm font-semibold ${
                manageState.ok
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {manageState.message}
            </p>
          ) : null}

          <div className="mt-5">
            <Button
              type="submit"
              variant="secondary"
              isLoading={isOpeningBilling}
            >
              Open billing settings
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
