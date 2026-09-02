import { NextResponse } from "next/server";
import { recordPublicReceiptWhatsappShare } from "@/server/services/public-receipt-generator.service";
import { recordPublicAgreementWhatsappShare } from "@/server/services/public-agreement-generator.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tool: string; documentId: string }> },
) {
  const { tool, documentId } = await params;
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    action?: unknown;
  } | null;

  if (body?.action !== "whatsapp_shared" || typeof body.token !== "string") {
    return NextResponse.json(
      { message: "Invalid activity request." },
      { status: 400 },
    );
  }

  if (tool === "receipt") {
    await recordPublicReceiptWhatsappShare({
      receiptId: documentId,
      token: body.token,
    });
  } else if (tool === "agreement") {
    await recordPublicAgreementWhatsappShare({
      agreementId: documentId,
      token: body.token,
    });
  } else {
    return NextResponse.json(
      { message: "Unknown document type." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
