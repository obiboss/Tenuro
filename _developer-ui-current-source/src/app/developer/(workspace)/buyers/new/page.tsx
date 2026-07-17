import Link from "next/link";
import { DeveloperBuyerForm } from "@/components/developer/developer-buyer-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewDeveloperBuyerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Buyer"
        description="Capture buyer KYC details before assigning the buyer to a plot."
      />

      <DeveloperBuyerForm />

      <Link
        href="/developer/buyers"
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Buyers
      </Link>
    </div>
  );
}
