import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { requireManager } from "@/server/services/auth.service";
import { getManagerStatementDocumentDownload } from "@/server/services/manager-statement-documents.service";
import { managerStatementDocumentQuerySchema } from "@/server/validators/manager-statement-documents.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const manager = await requireManager();
    const url = new URL(request.url);

    const input = managerStatementDocumentQuerySchema.parse({
      landlordClientId: url.searchParams.get("landlordClientId"),
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
    });

    const download = await getManagerStatementDocumentDownload({
      managerProfileId: manager.id,
      documentType: "landlord_statement",
      input,
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
        message: "Statement could not be downloaded.",
      },
      {
        status: 500,
      },
    );
  }
}
