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
    </div>
  );
}
