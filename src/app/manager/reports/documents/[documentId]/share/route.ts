import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { requireManager } from "@/server/services/auth.service";
import { getManagerStoredStatementDocumentWhatsAppLink } from "@/server/services/manager-statement-documents.service";
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

    const result =
      await getManagerStoredStatementDocumentWhatsAppLink({
        managerProfileId: manager.id,
        documentId: parsedDocumentId,
      });

    return NextResponse.redirect(result.whatsappUrl);
  } catch (error) {
    const message = isAppError(error)
      ? error.userMessage
      : "The report could not be shared.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      {
        status: isAppError(error) ? error.status : 500,
      },
    );
  }
}
