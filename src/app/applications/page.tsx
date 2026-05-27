import Link from "next/link";
import { ArrowRight, Building2, FileText, UserRoundCheck } from "lucide-react";
import { PropertyApplicationDecisionForms } from "@/components/applications/property-application-decision-forms";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentLandlordPropertyApplicationsForReview } from "@/server/services/property-application-review.service";

function formatMoney(amount: number | null, currencyCode: string) {
  if (!amount) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getApplicationBadgeTone(status: string) {
  if (status === "submitted_for_landlord_review" || status === "waitlisted") {
    return "warning" as const;
  }

  if (status === "accepted") {
    return "success" as const;
  }

  if (
    status === "rejected_by_landlord" ||
    status === "property_unavailable" ||
    status === "rejected_by_tenant_after_inspection" ||
    status === "cancelled"
  ) {
    return "danger" as const;
  }

  return "warning" as const;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getGuarantorAnswer(answers: Record<string, unknown>) {
  const value = answers.can_provide_guarantor;

  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  if (value === "not_sure") {
    return "Not sure";
  }

  return "Not answered";
}

function ApplicationPipelineStatus({
  status,
  convertedTenantId,
}: {
  status: string;
  convertedTenantId: string | null;
}) {
  if (convertedTenantId) {
    return (
      <div className="mt-4 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold leading-6 text-success">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>
            This application has been converted into the normal tenant pipeline.
          </p>

          <Link
            href={`/tenants/${convertedTenantId}`}
            className="inline-flex items-center justify-center gap-2 rounded-button bg-success px-4 py-2 text-xs font-black text-white transition hover:opacity-95"
          >
            Open tenant
            <ArrowRight aria-hidden="true" size={14} strokeWidth={2.6} />
          </Link>
        </div>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="mt-4 rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
        Application accepted, but tenant pipeline conversion is not linked yet.
      </div>
    );
  }

  return null;
}

export default async function LandlordApplicationsPage() {
  const applications = await getCurrentLandlordPropertyApplicationsForReview();

  return (
    <div>
      <PageHeader
        title="Tenant applications"
        description="Review tenant KYC details and selected property context from agent listing applications."
      />

      <SectionCard
        title="Applications for review"
        description="Each application is tied to a selected property listing and reusable tenant KYC profile."
      >
        {applications.length === 0 ? (
          <EmptyState
            title="No property application yet"
            description="When tenants apply through agent listing links, their applications will appear here for review."
            icon={<FileText aria-hidden="true" size={24} strokeWidth={2.6} />}
          />
        ) : (
          <div className="space-y-4">
            {applications.map((application) => {
              const tenant = application.tenant_kyc_profiles;
              const listing = application.agent_property_listings;

              return (
                <article
                  key={application.id}
                  className="rounded-card border border-border-soft bg-background p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-black text-text-strong">
                          {tenant?.full_name ?? "Tenant profile unavailable"}
                        </h2>

                        <Badge
                          tone={getApplicationBadgeTone(application.status)}
                        >
                          {formatStatus(application.status)}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                        Submitted:{" "}
                        {formatDate(
                          application.submitted_at ?? application.created_at,
                        )}
                      </p>
                    </div>
                  </div>

                  <ApplicationPipelineStatus
                    status={application.status}
                    convertedTenantId={application.converted_tenant_id}
                  />

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-card bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                          <UserRoundCheck
                            aria-hidden="true"
                            size={18}
                            strokeWidth={2.6}
                          />
                        </div>

                        <h3 className="font-black text-text-strong">
                          Tenant KYC
                        </h3>
                      </div>

                      <div className="space-y-3 text-sm font-semibold leading-6 text-text-muted">
                        <p>
                          <span className="font-black text-text-strong">
                            Phone:
                          </span>{" "}
                          {tenant?.phone_number ?? "Not available"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Email:
                          </span>{" "}
                          {tenant?.email ?? "Not provided"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Occupation:
                          </span>{" "}
                          {tenant?.occupation ?? "Not provided"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Employer:
                          </span>{" "}
                          {tenant?.employer ?? "Not provided"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Home address:
                          </span>{" "}
                          {tenant?.home_address ?? "Not provided"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Can provide guarantor:
                          </span>{" "}
                          {tenant
                            ? getGuarantorAnswer(tenant.kyc_answers)
                            : "Not answered"}
                        </p>
                      </div>

                      {tenant?.kyc_review_flags.length ? (
                        <div className="mt-4 rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
                          This application has KYC review flags. Check guarantor
                          availability or requested documents before approval.
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-card bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-2xl bg-gold-soft text-gold-deep">
                          <Building2
                            aria-hidden="true"
                            size={18}
                            strokeWidth={2.6}
                          />
                        </div>

                        <h3 className="font-black text-text-strong">
                          Selected listing
                        </h3>
                      </div>

                      <div className="space-y-3 text-sm font-semibold leading-6 text-text-muted">
                        <p>
                          <span className="font-black text-text-strong">
                            Property:
                          </span>{" "}
                          {listing?.property_name ?? "Not available"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Address:
                          </span>{" "}
                          {listing
                            ? `${listing.address}, ${listing.lga}, ${listing.state}`
                            : "Not available"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Unit:
                          </span>{" "}
                          {listing?.unit_identifier ?? "Not available"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Type:
                          </span>{" "}
                          {listing?.unit_type.replaceAll("_", " ") ??
                            "Not available"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Rent:
                          </span>{" "}
                          {listing
                            ? formatMoney(
                                listing.annual_rent ?? listing.monthly_rent,
                                listing.currency_code,
                              )
                            : "Not available"}
                        </p>

                        <p>
                          <span className="font-black text-text-strong">
                            Agent commission:
                          </span>{" "}
                          {listing
                            ? formatMoney(
                                listing.agent_commission_amount,
                                listing.currency_code,
                              )
                            : "Not available"}
                        </p>
                      </div>

                      <div className="mt-4 rounded-button bg-gold-soft px-4 py-3 text-sm font-semibold leading-6 text-gold-deep">
                        Review the tenant against the selected property before
                        accepting, rejecting, or waitlisting the application.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-card bg-white p-4">
                    <h3 className="mb-3 font-black text-text-strong">
                      Landlord decision
                    </h3>

                    <PropertyApplicationDecisionForms
                      applicationId={application.id}
                      status={application.status}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
