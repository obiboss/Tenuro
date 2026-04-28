import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { UnitForm } from "@/components/property/unit-form";
import { UnitCard } from "@/components/property/unit-card";
import { getCurrentLandlordProperty } from "@/server/services/properties.service";
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

  const [property, units] = await Promise.all([
    getCurrentLandlordProperty(propertyId),
    getPropertyUnitsForCurrentLandlord(propertyId),
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

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title="Units"
          description="Each room, flat, shop, or rentable space in this property."
        >
          {units.length === 0 ? (
            <EmptyState
              title="No unit added yet"
              description="Add the rooms, flats, or shops in this property so you can assign tenants."
              icon={<Home aria-hidden="true" size={24} strokeWidth={2.6} />}
            />
          ) : (
            <div className="grid gap-4">
              {units.map((unit) => (
                <UnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </SectionCard>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <SectionCard
            title="Add Unit"
            description="Create a rentable space under this property."
          >
            <UnitForm propertyId={property.id} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
