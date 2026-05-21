import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PropertySetupSection } from "@/components/property/property-setup-section";
import { PageHeader } from "@/components/ui/page-header";
import { getLandlordAgreementTemplateEditorState } from "@/server/services/agreement-templates.service";
import { getCurrentLandlordProperty } from "@/server/services/properties.service";
import { getCurrentLandlordPropertyRules } from "@/server/services/property-rules.service";
import { getPropertyUnitsForCurrentLandlord } from "@/server/services/units.service";

type PropertyDetailPageProps = {
  params: Promise<{
    propertyId: string;
  }>;
};

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { propertyId } = await params;

  const [property, units, propertyRules, agreementTemplate] = await Promise.all([
    getCurrentLandlordProperty(propertyId),
    getPropertyUnitsForCurrentLandlord(propertyId),
    getCurrentLandlordPropertyRules(propertyId),
    getLandlordAgreementTemplateEditorState({ propertyId }),
  ]);

  return (
    <div>
      <Link
        href="/properties"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back to properties
      </Link>

      <PageHeader
        title={property.property_name}
        description={`${property.address}, ${property.lga}, ${property.state}`}
      />

      <PropertySetupSection
        propertyId={property.id}
        propertyName={property.property_name}
        units={units}
        rules={propertyRules}
        agreementTemplate={agreementTemplate}
      />
    </div>
  );
}
