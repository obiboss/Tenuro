import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  FileText,
  ReceiptText,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHeroActions() {
  return (
    <div className="mt-8 max-w-2xl space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/receipt-generator">
          <Button size="lg" fullWidth>
            Generate Rent Receipt
            <ReceiptText aria-hidden="true" size={18} strokeWidth={2.6} />
          </Button>
        </Link>

        <Link href="/agreement-generator">
          <Button size="lg" variant="secondary" fullWidth>
            Create Tenancy Agreement
            <FileText aria-hidden="true" size={18} strokeWidth={2.6} />
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/register">
          <Button size="lg" variant="secondary" fullWidth>
            Landlord
            <Building2 aria-hidden="true" size={18} strokeWidth={2.6} />
          </Button>
        </Link>

        <Link href="/agent/register">
          <Button size="lg" variant="secondary" fullWidth>
            Agent
            <UserRoundCheck aria-hidden="true" size={18} strokeWidth={2.6} />
          </Button>
        </Link>
      </div>

      <Link href="/manager/register">
        <Button
          size="lg"
          variant="secondary"
          fullWidth
          className="border-gold/20 bg-gold-soft/40 hover:bg-gold-soft/70"
        >
          Property Manager
          <BriefcaseBusiness aria-hidden="true" size={18} strokeWidth={2.6} />
        </Button>
      </Link>
    </div>
  );
}
