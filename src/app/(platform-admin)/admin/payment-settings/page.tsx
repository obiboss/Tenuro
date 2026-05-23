import { PlatformPaymentSettingsForm } from "@/components/platform-admin/platform-payment-settings-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { requirePlatformAdminPage } from "@/server/services/platform-admin.service";
import { getPlatformAdminPaymentSettingsPageData } from "@/server/services/platform-payment-settings.service";

export default async function PlatformAdminPaymentSettingsPage() {
  await requirePlatformAdminPage();

  const settings = await getPlatformAdminPaymentSettingsPageData();

  return (
    <div>
      <PageHeader
        eyebrow="Platform Operations"
        title="Payment settings"
        description="Manage server-side agent verification fee configuration without redeploying the application."
        action={
          <Badge tone={settings.isAgentProcessingFeeEnabled ? "success" : "warning"}>
            {settings.isAgentProcessingFeeEnabled ? "Fee enabled" : "Fee disabled"}
          </Badge>
        }
      />

      <div className="max-w-4xl">
        <PlatformPaymentSettingsForm settings={settings} />
      </div>
    </div>
  );
}
