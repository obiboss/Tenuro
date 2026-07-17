import Link from "next/link";
import { DeveloperEstateForm } from "@/components/developer/developer-estate-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewDeveloperEstatePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Estate"
        description="Create the estate, set the buyer payment rule, and generate the plot inventory in one step."
      />

      <DeveloperEstateForm />

      <Link
        href="/developer/estates"
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Estates
      </Link>
    </div>
  );
}
