import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ManagerPropertyServiceChargeSettings } from "@/components/manager/manager-property-service-charge-settings";
import { ManagerPropertyTenantRequirements } from "@/components/manager/manager-property-tenant-requirements";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerPropertyRules,
} from "@/server/repositories/manager.repository";
import { listManagerPropertyTenantRequirements } from "@/server/repositories/manager-property-requirements.repository";
import { listManagerPropertyServiceChargeSettings } from "@/server/repositories/manager-property-settings.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type SettingsSection =
  | "charges"
  | "requirements";

type Props = {
  params: Promise<{
    propertyId: string;
  }>;
  searchParams?: Promise<{
    section?: string;
  }>;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(Number(amount))
      ? Number(amount)
      : 0,
  );
}

function formatFee(params: {
  management_fee_type:
    | "percentage"
    | "flat";
  management_fee_value: number;
}) {
  const value = Number(
    params.management_fee_value,
  );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "No management fee";
  }

  return params.management_fee_type ===
    "percentage"
    ? `${value.toLocaleString("en-NG")}%`
    : formatMoney(value);
}

function getCollectionLabel(value: string) {
  if (value === "manager_collects") {
    return "Manager collects";
  }

  if (value === "landlord_direct") {
    return "Landlord receives directly";
  }

  return "Automatic split";
}

function getPaystackBearerLabel(value: string) {
  if (value === "landlord") {
    return "Landlord";
  }

  if (value === "manager") {
    return "Manager";
  }

  if (value === "bopa") {
    return "BOPA";
  }

  return "Tenant";
}

function normalizeSection(
  value: string | undefined,
): SettingsSection {
  return value === "requirements"
    ? "requirements"
    : "charges";
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-card bg-surface p-4">
      <p className="text-xs font-black uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-text-strong">
        {value}
      </p>
    </div>
  );
}

export default async function ManagerPropertySettingsPage({
  params,
  searchParams,
}: Props) {
  const { propertyId } = await params;
  const resolvedSearchParams =
    await searchParams;
  const activeSection = normalizeSection(
    resolvedSearchParams?.section,
  );

  const manager = await requireManager();
  const supabase =
    await createSupabaseServerClient();

  const organization =
    await getManagerOrganizationForCurrentUser(
      supabase,
      manager.id,
    );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [
    landlordClients,
    properties,
    serviceCharges,
    tenantRequirements,
    agreementClauses,
  ] = await Promise.all([
    listManagerLandlordClients(
      supabase,
      organization.id,
    ),
    listManagerProperties(
      supabase,
      organization.id,
    ),
    listManagerPropertyServiceChargeSettings(
      supabase,
      {
        organizationId: organization.id,
        propertyId,
        activeOnly: true,
      },
    ),
    listManagerPropertyTenantRequirements(
      supabase,
      {
        organizationId: organization.id,
        propertyId,
        activeOnly: true,
      },
    ),
    listManagerPropertyRules(supabase, {
      organizationId: organization.id,
      propertyId,
      activeOnly: true,
    }),
  ]);

  const property = properties.find(
    (item) => item.id === propertyId,
  );

  if (!property) {
    notFound();
  }

  const landlord = landlordClients.find(
    (client) =>
      client.id ===
      property.landlord_client_id,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/manager/properties/${property.id}`}
          prefetch={false}
          className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
        >
          ← Back to property
        </Link>

        <h1 className="mt-3 text-2xl font-black tracking-tight text-text-strong">
          Property settings
        </h1>

        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          {property.property_name} ·{" "}
          {property.property_address}
        </p>

        {landlord ? (
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Landlord:{" "}
            <span className="font-black text-text-strong">
              {landlord.landlord_name}
            </span>
          </p>
        ) : null}
      </div>

      <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Rent and payment setup
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            These settings control how rent is collected
            and divided.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryItem
            label="Rent collection"
            value={getCollectionLabel(
              property.collection_mode,
            )}
          />
          <SummaryItem
            label="Management fee"
            value={formatFee(property)}
          />
          <SummaryItem
            label="Paystack charge"
            value={getPaystackBearerLabel(
              property.paystack_charge_bearer,
            )}
          />
        </div>
      </section>

      <div className="border-b border-border-soft">
        <nav
          aria-label="Property settings"
          className="flex gap-6"
        >
          <Link
            href={`/manager/properties/${property.id}/settings?section=charges`}
            prefetch={false}
            aria-current={
              activeSection === "charges"
                ? "page"
                : undefined
            }
            className={
              activeSection === "charges"
                ? "-mb-px border-b-2 border-text-strong px-1 pb-3 text-sm font-black text-text-strong"
                : "-mb-px border-b-2 border-transparent px-1 pb-3 text-sm font-bold text-text-muted transition hover:text-text-strong"
            }
          >
            Charges
          </Link>

          <Link
            href={`/manager/properties/${property.id}/settings?section=requirements`}
            prefetch={false}
            aria-current={
              activeSection === "requirements"
                ? "page"
                : undefined
            }
            className={
              activeSection === "requirements"
                ? "-mb-px border-b-2 border-text-strong px-1 pb-3 text-sm font-black text-text-strong"
                : "-mb-px border-b-2 border-transparent px-1 pb-3 text-sm font-bold text-text-muted transition hover:text-text-strong"
            }
          >
            Requirements
          </Link>
        </nav>
      </div>

      {activeSection === "charges" ? (
        <ManagerPropertyServiceChargeSettings
          propertyId={property.id}
          landlordClientId={
            property.landlord_client_id
          }
          initialCharges={serviceCharges}
        />
      ) : (
        <div className="space-y-6">
          <ManagerPropertyTenantRequirements
            propertyId={property.id}
            landlordClientId={
              property.landlord_client_id
            }
            initialRequirements={
              tenantRequirements
            }
          />

          <section className="rounded-card border border-border-soft bg-white shadow-sm">
            <div className="border-b border-border-soft p-4">
              <h2 className="text-lg font-black tracking-tight text-text-strong">
                Existing agreement clauses
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                These older free-text clauses are included
                in tenancy agreements. They do not screen
                tenant applications.
              </p>
            </div>

            {agreementClauses.length > 0 ? (
              <div className="divide-y divide-border-soft">
                {agreementClauses.map(
                  (clause) => (
                    <article
                      key={clause.id}
                      className="p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="font-black text-text-strong">
                          {clause.title}
                        </p>
                        <span className="w-fit rounded-full bg-surface px-3 py-1 text-xs font-black text-text-muted">
                          Agreement clause
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                        {clause.description}
                      </p>
                    </article>
                  ),
                )}
              </div>
            ) : (
              <div className="p-4">
                <p className="rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
                  No older agreement clauses have been
                  added.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
