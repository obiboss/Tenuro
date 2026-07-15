import { NextResponse } from "next/server";
import { isAppError, AppError } from "@/server/errors/app-error";
import { getManagerTenantAgreementById } from "@/server/repositories/manager-tenant-onboarding.repository";
import { getManagerTenancyAgreementPdfDownload } from "@/server/services/manager-tenancy-agreement-pdf.service";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManagerAgreementDownloadRouteProps = {
  params: Promise<{
    agreementId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ManagerAgreementDownloadRouteProps,
) {
  try {
    const { agreementId } = await params;
    const { access } =
      await requireManagerWorkspacePermission("property.manage");

    if (!access.organization || access.organization.status !== "active") {
      throw new AppError(
        "MANAGER_ORGANIZATION_REQUIRED",
        "Create or join an active BOPA Manager organization before continuing.",
        403,
      );
    }

    const supabase = createSupabaseAdminClient();
    const agreement = await getManagerTenantAgreementById(supabase, {
      organizationId: access.organization.id,
      agreementId,
    });

    if (!agreement) {
      throw new AppError(
        "MANAGER_AGREEMENT_NOT_FOUND",
        "Agreement document was not found.",
        404,
      );
    }

    const download = await getManagerTenancyAgreementPdfDownload({
      supabase,
      agreement,
    });

    return new NextResponse(download.fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${download.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        {
          ok: false,
          message: error.userMessage,
        },
        {
          status: error.status,
        },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Agreement could not be downloaded.",
      },
      {
        status: 500,
      },
    );
  }
}
