import { DemoRequestsList } from "@/components/platform-admin/demo-requests-list";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformAdminDemoRequests } from "@/server/services/demo-request.service";

export default async function PlatformAdminDemoRequestsPage() {
  const queue = await getPlatformAdminDemoRequests();

  return (
    <div>
      <PageHeader
        eyebrow="Business Enquiries"
        title="Demo requests"
        description="Review and respond to companies that requested a BOPA Manager or BOPA Developer demonstration."
      />

      <DemoRequestsList requests={queue.requests} totals={queue.totals} />
    </div>
  );
}
