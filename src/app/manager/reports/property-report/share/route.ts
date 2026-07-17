import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { requireManager } from "@/server/services/auth.service";
import { getManagerPropertyReportWhatsAppLink } from "@/server/services/manager-statement-documents.service";
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

    const result =
      await getManagerPropertyReportWhatsAppLink({
        managerProfileId: manager.id,
        input,
      });

    return NextResponse.redirect(result.whatsappUrl);
  } catch (error) {
    const message = isAppError(error)
      ? error.userMessage
      : "Property report could not be shared.";

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
