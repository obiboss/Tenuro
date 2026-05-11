import Link from "next/link";
import { Button } from "@/components/ui/button";

type FreeToolAccountPromptProps = {
  claimUrl?: string;
};

export function FreeToolAccountPrompt({
  claimUrl,
}: FreeToolAccountPromptProps) {
  return (
    <div className="rounded-card bg-primary p-5 text-white shadow-card md:p-6">
      <p className="text-sm font-bold uppercase tracking-wide text-white/75">
        Your receipt is ready
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        Want to save receipts and track tenant payments?
      </h2>

      <p className="mt-3 text-sm leading-6 text-white/80">
        Your details are already captured from this receipt. Create a free BOPA
        account with a password and continue from your landlord dashboard.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {claimUrl ? (
          <Link href={claimUrl}>
            <Button type="button" variant="secondary" fullWidth>
              Create Free Account
            </Button>
          </Link>
        ) : (
          <Link href="/register">
            <Button type="button" variant="secondary" fullWidth>
              Create Free Account
            </Button>
          </Link>
        )}

        <Link href="/receipt-generator">
          <Button type="button" variant="ghost" fullWidth>
            Maybe Later
          </Button>
        </Link>
      </div>
    </div>
  );
}
