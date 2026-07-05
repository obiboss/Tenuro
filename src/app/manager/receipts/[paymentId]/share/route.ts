import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { requireManager } from "@/server/services/auth.service";
import { getManagerRentReceiptWhatsAppLink } from "@/server/services/manager-receipts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManagerReceiptShareRouteProps = {
  params: Promise<{
    paymentId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ManagerReceiptShareRouteProps,
) {
  try {
    const manager = await requireManager();
    const resolvedParams = await params;

    const result = await getManagerRentReceiptWhatsAppLink({
      managerProfileId: manager.id,
      rentPaymentId: resolvedParams.paymentId,
    });

    return NextResponse.redirect(result.whatsappUrl);
  } catch (error) {
    const message = isAppError(error)
      ? error.userMessage
      : "Receipt could not be shared.";

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
