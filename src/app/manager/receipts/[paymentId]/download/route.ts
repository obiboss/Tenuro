import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { requireManager } from "@/server/services/auth.service";
import { getManagerRentReceiptDownload } from "@/server/services/manager-receipts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManagerReceiptDownloadRouteProps = {
  params: Promise<{
    paymentId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ManagerReceiptDownloadRouteProps,
) {
  try {
    const manager = await requireManager();
    const resolvedParams = await params;

    const download = await getManagerRentReceiptDownload({
      managerProfileId: manager.id,
      rentPaymentId: resolvedParams.paymentId,
    });

    return new NextResponse(download.fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${download.receipt.file_name}"`,
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
        message: "Receipt could not be downloaded.",
      },
      {
        status: 500,
      },
    );
  }
}
