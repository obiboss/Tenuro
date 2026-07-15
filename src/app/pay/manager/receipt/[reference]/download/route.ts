import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { getManagerReceiptDownloadByPaymentReference } from "@/server/services/manager-payment-documents.service";
import { MANAGER_RECEIPT_NOT_READY_MESSAGE } from "@/server/services/manager-receipts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManagerReceiptByReferenceRouteProps = {
  params: Promise<{
    reference: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ManagerReceiptByReferenceRouteProps,
) {
  try {
    const { reference } = await params;
    const download = await getManagerReceiptDownloadByPaymentReference(
      decodeURIComponent(reference),
    );

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
        message: MANAGER_RECEIPT_NOT_READY_MESSAGE,
      },
      {
        status: 500,
      },
    );
  }
}
