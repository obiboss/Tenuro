import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PropertyForm } from "@/components/property/property-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/properties"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back to properties
      </Link>

      <PageHeader
        title="Add Property"
        description="Enter the basic details of the property you want to manage."
      />

      <PropertyForm />
    </div>
  );
}
