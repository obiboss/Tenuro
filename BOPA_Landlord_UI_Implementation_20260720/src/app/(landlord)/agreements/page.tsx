import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { AgreementTemplateEditor } from "@/components/agreement/agreement-template-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getLandlordAgreementTemplateEditorState } from "@/server/services/agreement-templates.service";
import { getCurrentLandlordProperties } from "@/server/services/properties.service";

type AgreementsPageProps = {
  searchParams: Promise<{
    edit?: string;
    property?: string;
  }>;
};

export default async function AgreementsPage({
  searchParams,
}: AgreementsPageProps) {
  const { edit, property: propertyId } = await searchParams;
  const isEditing = edit === "general" || Boolean(propertyId);

  if (isEditing) {
    const agreement = await getLandlordAgreementTemplateEditorState(
      propertyId ? { propertyId } : undefined,
    );

    return (
      <div className="mx-auto max-w-4xl">
        <Link
          href="/agreements"
          className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
          Back to agreements
        </Link>

        <PageHeader
          title={
            propertyId
              ? `Agreement for ${agreement.propertyName ?? "this property"}`
              : "General tenancy agreement"
          }
          description="Read through the wording and make any changes before you need to send it to a tenant."
        />

        <SectionCard
          title="Agreement wording"
          description="BOPA will add the tenant, rent, unit and property details when an agreement is prepared."
        >
          <AgreementTemplateEditor
            scope={agreement.scope}
            propertyId={agreement.propertyId}
            propertyName={agreement.propertyName}
            name={agreement.name}
            templateBody={agreement.templateBody}
          />
        </SectionCard>
      </div>
    );
  }

  const properties = await getCurrentLandlordProperties();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agreements"
        description="Prepare your agreement before you need to send one to a tenant."
      />

      <section className="rounded-card border border-border-soft bg-white p-5 shadow-card md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <FileText aria-hidden="true" size={24} strokeWidth={2.5} />
            </span>
            <div>
              <Badge tone="primary">General agreement</Badge>
              <h2 className="mt-3 text-xl font-black text-text-strong">
                Your standard tenancy agreement
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Used for every property unless you save different wording for
                one property.
              </p>
            </div>
          </div>

          <Link href="/agreements?edit=general" className="shrink-0">
            <Button size="lg" fullWidth>
              View or edit agreement
            </Button>
          </Link>
        </div>
      </section>

      <section
        className="space-y-3"
        aria-labelledby="property-agreements-heading"
      >
        <h2
          id="property-agreements-heading"
          className="text-xl font-black text-text-strong"
        >
          Property-specific agreements
        </h2>

        {properties.length > 0 ? (
          <div className="overflow-hidden rounded-card border border-border-soft bg-white">
            {properties.map((property) => (
              <div
                key={property.id}
                className="flex flex-col gap-3 border-b border-border-soft p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-black text-text-strong">
                    {property.property_name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    Uses your general agreement unless you change it.
                  </p>
                </div>

                <Link
                  href={`/agreements?property=${property.id}`}
                  className="inline-flex min-h-11 items-center font-extrabold text-primary hover:text-primary-hover"
                >
                  Edit for this property
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-border-soft bg-white p-5 text-sm font-semibold text-text-muted">
            Add a property before creating property-specific agreement wording.
          </div>
        )}
      </section>
    </div>
  );
}
