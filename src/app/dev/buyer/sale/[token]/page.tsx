import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { DeveloperBuyerSalePortalView } from "@/components/developer/developer-buyer-sale-portal-view";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getBuyerSalePortalByToken } from "@/server/services/developer-buyer-portal.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BuyerSalePortalPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function BuyerPortalLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Boldverse Property
        </p>
        <p className="text-xs font-semibold text-text-muted">
          Buyer payment portal
        </p>
      </div>
    </Link>
  );
}

export default async function BuyerSalePortalPage({
  params,
}: BuyerSalePortalPageProps) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const portalData = await getBuyerSalePortalByToken({
    supabase,
    token,
  });

  if (!portalData) {
    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <BuyerPortalLogo />

          <SectionCard
            title="Payment portal unavailable"
            description="We could not open this buyer payment portal."
          >
            <TrustNotice
              title="Please request a new link"
              description="This link may be invalid, revoked, or expired."
              icon={<AlertTriangle aria-hidden="true" size={22} />}
            />
          </SectionCard>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <BuyerPortalLogo />

        <PageHeader
          title="Your Plot Payment Portal"
          description="View your plot details, payment schedule, confirmed payments, and receipts."
        />

        <DeveloperBuyerSalePortalView data={portalData} token={token} />
      </section>
    </main>
  );
}
