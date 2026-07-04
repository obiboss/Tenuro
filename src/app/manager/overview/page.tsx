import { redirect } from "next/navigation";
import { ManagerOverviewCards } from "@/components/manager/manager-overview-cards";
import { PageHeader } from "@/components/ui/page-header";
import { getManagerOverview } from "@/server/services/manager.service";

export default async function ManagerOverviewPage() {
  const overview = await getManagerOverview();

  if (!overview) {
    redirect("/manager/onboarding");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager overview"
        description="A simple view of your landlord clients, properties, tenants, and recorded rent."
      />

      <ManagerOverviewCards overview={overview} />
    </div>
  );
}
