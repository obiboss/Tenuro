import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  BUSINESS_SUBSCRIPTION_ANNUAL_SAVING_NAIRA,
  BUSINESS_SUBSCRIPTION_PRICES,
} from "@/constants/business-subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BusinessSubscriptionPricingProps = {
  signupHref: string;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BusinessSubscriptionPricing({
  signupHref,
}: BusinessSubscriptionPricingProps) {
  return (
    <section className="mt-8 rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <Badge tone="primary">Start with 2 months free</Badge>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-strong md:text-4xl">
            Use every company tool free for two months.
          </h2>
          <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
            No payment is required to begin. After your free period, choose a
            monthly or yearly subscription to keep your company workspace
            active.
          </p>

          <div className="mt-5 space-y-3">
            <p className="flex items-center gap-3 text-sm font-bold text-text-strong">
              <CheckCircle2
                aria-hidden="true"
                className="shrink-0 text-success"
                size={20}
                strokeWidth={2.7}
              />
              One subscription covers the owner and authorised staff.
            </p>
            <p className="flex items-center gap-3 text-sm font-bold text-text-strong">
              <CheckCircle2
                aria-hidden="true"
                className="shrink-0 text-success"
                size={20}
                strokeWidth={2.7}
              />
              Your records remain safe if the subscription expires.
            </p>
          </div>

          <div className="mt-7">
            <Link href={signupHref}>
              <Button type="button">
                Start 2 months free
                <ArrowRight aria-hidden="true" size={17} strokeWidth={2.6} />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-border-soft bg-background p-6">
            <p className="font-black text-text-strong">Monthly</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-text-strong">
              {formatNaira(BUSINESS_SUBSCRIPTION_PRICES.monthly.amountNaira)}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Billed every month after the free period.
            </p>
          </div>

          <div className="rounded-card border-2 border-primary bg-primary-soft p-6">
            <p className="font-black text-text-strong">Yearly</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-text-strong">
              {formatNaira(BUSINESS_SUBSCRIPTION_PRICES.annual.amountNaira)}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Save {formatNaira(BUSINESS_SUBSCRIPTION_ANNUAL_SAVING_NAIRA)} each
              year compared with monthly billing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
