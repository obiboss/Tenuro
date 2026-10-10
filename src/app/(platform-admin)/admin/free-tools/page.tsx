import { AdminFreeToolsControls } from "@/components/platform-admin/admin-free-tools-controls";
import { AdminFreeToolsOverview } from "@/components/platform-admin/admin-free-tools-overview";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPlatformAdminFreeToolsReport,
  getPublicDocumentIdentityLinkingSetting,
  parsePlatformAdminFreeToolsPeriod,
  parsePlatformAdminFreeToolsProduct,
} from "@/server/services/platform-admin-free-tools.service";
import { requirePlatformAdminPage } from "@/server/services/platform-admin.service";

type PlatformAdminFreeToolsPageProps = {
  searchParams: Promise<{ period?: string; product?: string }>;
};

export default async function PlatformAdminFreeToolsPage({
  searchParams,
}: PlatformAdminFreeToolsPageProps) {
  await requirePlatformAdminPage();
  const params = await searchParams;
  const periodDays = parsePlatformAdminFreeToolsPeriod(params.period);
  const product = parsePlatformAdminFreeToolsProduct(params.product);
  const [report, identityLinking] = await Promise.all([
    getPlatformAdminFreeToolsReport({
      periodDays,
      product,
      page: 1,
      pageSize: 10,
    }),
    getPublicDocumentIdentityLinkingSetting(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Free tools"
        description="See usage, payments and free-credit conversion for public document tools."
        action={
          <AdminFreeToolsControls periodDays={periodDays} product={product} />
        }
      />
      <AdminFreeToolsOverview
        report={report}
        identityLinkingEnabled={identityLinking.enabled}
      />
    </div>
  );
}
