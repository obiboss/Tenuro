import { notFound } from "next/navigation";
import { DeveloperEstateWorkspace } from "@/components/developer/developer-estate-workspace";
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
    <DeveloperEstateWorkspace
      estate={{
        id: estate.id,
        name: estate.estate_name,
        location: formatEstateLocation({
          location: estate.location,
          city: estate.city,
          lga: estate.lga,
          state: estate.state,
        }),
      }}
      plotTypes={plotTypes}
      plots={plots}
      availablePlots={availablePlots}
      buyers={buyers}
      assignments={assignments}
    />
  );
}
