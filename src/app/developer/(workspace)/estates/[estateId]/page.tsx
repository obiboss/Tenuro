import { notFound } from "next/navigation";
import { DeveloperEstateDetail } from "@/components/developer/developer-estate-detail";
import { DeveloperPlotAssignmentForm } from "@/components/developer/developer-plot-assignment-form";
import { DeveloperPlotForm } from "@/components/developer/developer-plot-form";
import { DeveloperPlotTypeForm } from "@/components/developer/developer-plot-type-form";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { listAssignableDeveloperBuyers } from "@/server/repositories/developer-buyers.repository";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getDeveloperEstateById } from "@/server/repositories/developer-estates.repository";
import { listDeveloperPlotAssignmentsForEstate } from "@/server/repositories/developer-plot-assignments.repository";
import {
  listAvailableDeveloperPlotsForEstate,
  listDeveloperPlotsForEstate,
  listDeveloperPlotTypesForEstate,
} from "@/server/repositories/developer-plots.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DeveloperEstatePageProps = {
  params: Promise<{
    estateId: string;
  }>;
};

function formatEstateLocation(params: {
  location: string;
  city: string | null;
  lga: string | null;
  state: string | null;
}) {
  return [params.location, params.city, params.lga, params.state]
    .filter(Boolean)
    .join(", ");
}

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

  const [plotTypes, plots, availablePlots, buyers, assignments] =
    await Promise.all([
      listDeveloperPlotTypesForEstate(supabase, {
        developerAccountId: account.id,
        estateId,
      }),
      listDeveloperPlotsForEstate(supabase, {
        developerAccountId: account.id,
        estateId,
      }),
      listAvailableDeveloperPlotsForEstate(supabase, {
        developerAccountId: account.id,
        estateId,
      }),
      listAssignableDeveloperBuyers(supabase, account.id),
      listDeveloperPlotAssignmentsForEstate(supabase, {
        developerAccountId: account.id,
        estateId,
      }),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={estate.estate_name}
        description={formatEstateLocation({
          location: estate.location,
          city: estate.city,
          lga: estate.lga,
          state: estate.state,
        })}
      />

      <DeveloperEstateDetail
        plotTypes={plotTypes}
        plots={plots}
        availablePlots={availablePlots}
        buyers={buyers}
        assignments={assignments}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Step 1 — Describe the kind of plots you sell"
          description="Add a simple plot category first. Example: 500 sqm Residential Plot at ₦5,000,000."
        >
          <DeveloperPlotTypeForm estateId={estate.id} />
        </SectionCard>

        <SectionCard
          title="Step 2 — Add the actual plot numbers"
          description="Add each plot number under this estate. Example: A1, A2, B10, or Plot 15."
        >
          <DeveloperPlotForm estateId={estate.id} plotTypes={plotTypes} />
        </SectionCard>
      </div>

      <SectionCard
        title="Step 3 — Give a plot to a buyer"
        description="Choose a buyer and the plot you want to give them. After this, you can create their sale and payment plan."
      >
        <DeveloperPlotAssignmentForm
          estateId={estate.id}
          buyers={buyers}
          plots={availablePlots}
        />
      </SectionCard>
    </div>
  );
}
