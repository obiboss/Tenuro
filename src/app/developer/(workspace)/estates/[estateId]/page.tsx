import { notFound } from "next/navigation";
import { DeveloperEstateDetail } from "@/components/developer/developer-estate-detail";
import { DeveloperPlotForm } from "@/components/developer/developer-plot-form";
import { DeveloperPlotTypeForm } from "@/components/developer/developer-plot-type-form";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getDeveloperEstateById } from "@/server/repositories/developer-estates.repository";
import {
  listDeveloperPlotsForEstate,
  listDeveloperPlotTypesForEstate,
} from "@/server/repositories/developer-plots.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperEstatePageProps = {
  params: Promise<{
    estateId: string;
  }>;
};

export default async function DeveloperEstatePage({
  params,
}: DeveloperEstatePageProps) {
  const { estateId } = await params;
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  if (!account) {
    notFound();
  }

  const estate = await getDeveloperEstateById(supabase, {
    developerAccountId: account.id,
    estateId,
  });

  if (!estate) {
    notFound();
  }

  const [plotTypes, plots] = await Promise.all([
    listDeveloperPlotTypesForEstate(supabase, {
      developerAccountId: account.id,
      estateId,
    }),
    listDeveloperPlotsForEstate(supabase, {
      developerAccountId: account.id,
      estateId,
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={estate.estate_name}
        description={`${estate.location}${estate.state ? `, ${estate.state}` : ""}`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <DeveloperEstateDetail
          estate={estate}
          plotTypes={plotTypes}
          plots={plots}
        />

        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <SectionCard
            title="Add Plot Type"
            description="Create reusable size and pricing templates."
          >
            <DeveloperPlotTypeForm estateId={estate.id} />
          </SectionCard>

          <SectionCard
            title="Add Plot"
            description="Create individual plots under this estate."
          >
            <DeveloperPlotForm estateId={estate.id} plotTypes={plotTypes} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
