import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { requireManager } from "@/server/services/auth.service";
import { getManagerStatementWhatsAppLink } from "@/server/services/manager-statement-documents.service";
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

    const result = await getManagerStatementWhatsAppLink({
      managerProfileId: manager.id,
      documentType: "remittance_summary",
      input,
    });

    return NextResponse.redirect(result.whatsappUrl);
  } catch (error) {
    const message = isAppError(error)
      ? error.userMessage
      : "Remittance summary could not be shared.";

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
