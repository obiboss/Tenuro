import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PropertyCard } from "@/components/property/property-card";
import { getCurrentLandlordProperties } from "@/server/services/properties.service";

export default async function PropertiesPage() {
  const properties = await getCurrentLandlordProperties();

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Manage your buildings, flats, rooms, shops, and rental units."
        action={
          <Link href="/properties/new">
            <Button>Add Property</Button>
          </Link>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          title="No property added yet"
          description="Add your first property to start tracking tenants, rent, and receipts."
          icon={<Building2 aria-hidden="true" size={24} strokeWidth={2.6} />}
          action={
            <Link href="/properties/new">
              <Button>Add Property</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
