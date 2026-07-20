import { BusinessSubscriptionPanel } from "@/components/subscription/business-subscription-panel";
import { requireDeveloperUser } from "@/server/services/auth.service";
import { getBusinessSubscriptionPageData } from "@/server/services/business-subscription.service";

export default async function DeveloperSubscriptionPage() {
  const developer = await requireDeveloperUser();
  const data = await getBusinessSubscriptionPageData({
    profileId: developer.id,
    workspaceType: "developer",
    profileEmail: developer.email,
  });

  return (
    <BusinessSubscriptionPanel
      workspaceType="developer"
      businessName={data.businessName}
      isOwner={data.isOwner}
      hasAccess={data.hasAccess}
      status={data.subscription.status}
      trialExpiresAt={data.subscription.trial_expires_at}
      trialDaysRemaining={data.trialDaysRemaining}
      currentPeriodEnd={data.subscription.current_period_end}
      billingInterval={data.subscription.billing_interval}
      defaultBillingEmail={data.defaultBillingEmail}
      hasPaystackSubscription={Boolean(
        data.subscription.paystack_subscription_code,
      )}
    />
  );
}
