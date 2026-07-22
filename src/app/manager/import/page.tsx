import { ManagerImportWorkspace } from "@/components/manager/manager-import-workspace";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";

export default async function ManagerImportPage() {
  await requireManagerWorkspacePermission("records.import");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-text-strong">
          Import existing records
        </h1>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-text-muted">
          Bring an existing property portfolio into BOPA without typing every
          landlord, property, unit, tenant and recent payment again.
        </p>
      </div>

      <ManagerImportWorkspace />
    </div>
  );
}
