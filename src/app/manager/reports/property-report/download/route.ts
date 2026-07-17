import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { requireManager } from "@/server/services/auth.service";
import { getManagerPropertyReportDownload } from "@/server/services/manager-statement-documents.service";
import { managerPropertyReportQuerySchema } from "@/server/validators/manager-statement-documents.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const manager = await requireManager();
    const url = new URL(request.url);

    const input = managerPropertyReportQuerySchema.parse({
      propertyId: url.searchParams.get("propertyId"),
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
    });

    const download = await getManagerPropertyReportDownload({
      managerProfileId: manager.id,
      input,
    });

    return new NextResponse(download.fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${download.fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
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
        message: "Property report could not be downloaded.",
      },
      {
        status: 500,
      },
    );
  }
}
