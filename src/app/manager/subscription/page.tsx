import { BusinessSubscriptionPanel } from "@/components/subscription/business-subscription-panel";
import { requireManagerUser } from "@/server/services/auth.service";
import { getBusinessSubscriptionPageData } from "@/server/services/business-subscription.service";

export default async function ManagerSubscriptionPage() {
  const manager = await requireManagerUser();
  const data = await getBusinessSubscriptionPageData({
    profileId: manager.id,
    workspaceType: "manager",
    profileEmail: manager.email,
  });

  return (
    <BusinessSubscriptionPanel
      workspaceType="manager"
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
