import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FreeToolAccountPrompt() {
  return (
    <div className="rounded-card bg-primary p-5 text-white shadow-card md:p-6">
      <p className="text-sm font-bold uppercase tracking-wide text-white/75">
        Your receipt is ready
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        Want to save receipts and track tenant payments?
      </h2>

      <p className="mt-3 text-sm leading-6 text-white/80">
        Create a free BOPA account after generating your receipt. Your details
        can be used to continue faster when account attachment is enabled in the
        next batch.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/register">
          <Button type="button" variant="secondary" fullWidth>
            Create Free Account
          </Button>
        </Link>

        <Link href="/receipt-generator">
          <Button type="button" variant="ghost" fullWidth>
            Maybe Later
          </Button>
        </Link>
      </div>
    </div>
  );
}
