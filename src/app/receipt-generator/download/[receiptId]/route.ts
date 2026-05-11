import { NextResponse } from "next/server";
import { renderPublicGeneratedReceiptPdf } from "@/server/services/receipt-pdf.service";
import { getPublicGeneratedReceiptForDownload } from "@/server/services/public-receipt-generator.service";

type PublicReceiptDownloadRouteProps = {
  params: Promise<{
    receiptId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: PublicReceiptDownloadRouteProps,
) {
  const { receiptId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { message: "Receipt download token is required." },
      { status: 400 },
    );
  }

  const receipt = await getPublicGeneratedReceiptForDownload({
    receiptId,
    token,
  });

  const pdfBuffer = await renderPublicGeneratedReceiptPdf(receipt);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.receipt_number}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
