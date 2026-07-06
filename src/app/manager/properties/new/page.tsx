import Link from "next/link";
import { redirect } from "next/navigation";
import { ManagerPropertyForm } from "@/components/manager/manager-property-form";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function NewManagerPropertyPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const landlordClients = await listManagerLandlordClients(
    supabase,
    organization.id,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/manager/properties"
        prefetch={false}
        className="inline-flex text-sm font-black text-primary"
      >
        ← Back to properties
      </Link>

      <div className="max-w-3xl">
        <h1 className="text-2xl font-black tracking-tight text-text-strong">
          Add property
        </h1>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Set up the property once. BOPA will reuse it for units, tenants,
          payments, receipts, and statements.
        </p>
      </div>

      <ManagerPropertyForm landlordClients={landlordClients} />
    </div>
  );
}
