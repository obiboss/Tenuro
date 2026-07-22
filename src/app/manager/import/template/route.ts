import { buildManagerImportTemplate } from "@/server/import/manager-excel-import";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";

export const runtime = "nodejs";

export async function GET() {
  await requireManagerWorkspacePermission("records.import");
  const workbook = await buildManagerImportTemplate();

  return new Response(workbook, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="BOPA_Manager_Import_Template.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
