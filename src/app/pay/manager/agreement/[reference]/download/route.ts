import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { getManagerAgreementDownloadByPaymentReference } from "@/server/services/manager-payment-documents.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManagerAgreementByReferenceRouteProps = {
  params: Promise<{
    reference: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ManagerAgreementByReferenceRouteProps,
) {
  try {
    const { reference } = await params;
    const download = await getManagerAgreementDownloadByPaymentReference(
      decodeURIComponent(reference),
    );

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
