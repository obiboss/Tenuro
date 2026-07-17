import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { requireManager } from "@/server/services/auth.service";
import { getManagerStoredStatementDocumentDownload } from "@/server/services/manager-statement-documents.service";
import { managerStatementDocumentIdSchema } from "@/server/validators/manager-statement-documents.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const manager = await requireManager();
    const { documentId } = await context.params;
    const parsedDocumentId =
      managerStatementDocumentIdSchema.parse(documentId);

    const download =
      await getManagerStoredStatementDocumentDownload({
        managerProfileId: manager.id,
        documentId: parsedDocumentId,
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
        message: "The report could not be downloaded.",
      },
      {
        status: 500,
      },
    );
  }
}
