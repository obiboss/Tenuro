import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { DeveloperBuyerPurchaseView } from "@/components/developer/developer-buyer-purchase-view";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getBuyerPurchaseByToken } from "@/server/services/developer-buyer-purchase.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BuyerPurchasePageProps = {
  params: Promise<{
    token: string;
  }>;
};

function BuyerPurchaseLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Boldverse Property
        </p>
        <p className="text-xs font-semibold text-text-muted">Plot purchase</p>
      </div>
    </Link>
  );
}

export default async function BuyerPurchasePage({
  params,
}: BuyerPurchasePageProps) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const purchaseData = await getBuyerPurchaseByToken({
    supabase,
    token,
  });

  if (!purchaseData) {
    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <BuyerPurchaseLogo />

          <SectionCard
            title="Purchase link unavailable"
            description="We could not open this plot purchase page."
          >
            <TrustNotice
              title="Please request a new link"
              description="This link may be invalid, expired, or no longer active."
              icon={<AlertTriangle aria-hidden="true" size={22} />}
            />
          </SectionCard>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <BuyerPurchaseLogo />

        <PageHeader
          title="Complete your plot purchase"
          description="Fill your details and make the required payment to continue with this plot purchase."
        />

        <DeveloperBuyerPurchaseView data={purchaseData} token={token} />
      </section>
    </main>
  );
}
