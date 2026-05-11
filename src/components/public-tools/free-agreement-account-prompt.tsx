import Link from "next/link";
import { Button } from "@/components/ui/button";

type FreeAgreementAccountPromptProps = {
  claimUrl: string;
};

export function FreeAgreementAccountPrompt({
  claimUrl,
}: FreeAgreementAccountPromptProps) {
  return (
    <div className="rounded-card bg-primary p-5 text-white shadow-card md:p-6">
      <p className="text-sm font-bold uppercase tracking-wide text-white/75">
        Agreement generated
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        Save this agreement inside your landlord dashboard.
      </h2>

      <p className="mt-3 text-sm leading-6 text-white/80">
        Create a free BOPA account with the landlord details already captured
        from this agreement. You can then keep the agreement attached to your
        property and tenant record.
      </p>

      <div className="mt-5 grid gap-3">
        <Link href={claimUrl}>
          <Button type="button" variant="secondary" fullWidth>
            Create Free Account
          </Button>
        </Link>

        <Link href="/agreement-generator">
          <Button type="button" variant="ghost" fullWidth>
            Generate Another Agreement
          </Button>
        </Link>
      </div>
    </div>
  );
}
