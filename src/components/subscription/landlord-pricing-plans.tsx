import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LandlordPricingPlansProps = {
  basicAnnualPriceNaira: number;
  proAnnualPriceNaira: number;
  isTrialing: boolean;
  trialExpiresAt: string | null;
  subscriptionRequired?: boolean;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function PricingPlanCard(params: {
  name: string;
  annualPrice: number;
  description: string;
  isTrialing: boolean;
  highlighted?: boolean;
}) {
  return (
    <Card
      className={
        params.highlighted
          ? "border-primary/30 bg-linear-to-br from-primary-soft/40 to-white"
          : undefined
      }
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{params.name}</CardTitle>
          {params.isTrialing ? (
            <Badge tone="success">FREE for first month</Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-bold text-text-muted">Annual pricing</p>
          <p
            className={
              params.isTrialing
                ? "mt-1 text-lg font-extrabold text-text-muted line-through decoration-2"
                : "mt-1 text-2xl font-extrabold text-text-strong"
            }
          >
            {formatMoney(params.annualPrice)}/year
          </p>
          {params.isTrialing ? (
            <p className="mt-1 text-xl font-extrabold text-success">
              FREE for first month
            </p>
          ) : null}
        </div>

        <p className="text-sm leading-6 text-text-muted">{params.description}</p>
      </CardContent>
    </Card>
  );
}

export function LandlordPricingPlans({
  basicAnnualPriceNaira,
  proAnnualPriceNaira,
  isTrialing,
  trialExpiresAt,
  subscriptionRequired = false,
}: LandlordPricingPlansProps) {
  const formattedTrialExpiry = formatDate(trialExpiresAt);

  return (
    <div className="space-y-4">
      {subscriptionRequired ? (
        <p className="text-sm leading-6 text-text-muted">
          Choose BOPA Basic or BOPA Pro to restore access to properties,
          tenants, payments, and onboarding tools.
        </p>
      ) : isTrialing && formattedTrialExpiry ? (
        <p className="text-sm leading-6 text-text-muted">
          Your first month of platform access is free until{" "}
          <span className="font-bold text-text-strong">
            {formattedTrialExpiry}
          </span>
          . After that, subscribe to BOPA Basic or BOPA Pro to continue.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <PricingPlanCard
          name="BOPA Basic"
          annualPrice={basicAnnualPriceNaira}
          description="Essential landlord tools for property, tenant, and rent management."
          isTrialing={isTrialing}
        />

        <PricingPlanCard
          name="BOPA Pro"
          annualPrice={proAnnualPriceNaira}
          description="Advanced workflows, reporting, and operational controls for growing portfolios."
          isTrialing={isTrialing}
          highlighted
        />
      </div>
    </div>
  );
}
