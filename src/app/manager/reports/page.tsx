import { ManagerReportsWorkspace } from "@/components/manager/manager-reports-workspace";
import { getManagerUnifiedReportData } from "@/server/services/manager-unified-report.service";

export type ManagerReportsPageProps = {
  searchParams: Promise<{
    landlordClientId?: string;
    propertyId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function ManagerReportsPage({
  searchParams,
}: ManagerReportsPageProps) {
  const params = await searchParams;
  const reportData = await getManagerUnifiedReportData(params);

  return (
    <ManagerReportsWorkspace
      landlordOptions={reportData.landlordOptions}
      propertyOptions={reportData.propertyOptions}
      snapshot={reportData.snapshot}
    />
  );
}
