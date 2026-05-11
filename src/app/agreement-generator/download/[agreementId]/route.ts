import { NextResponse } from "next/server";
import { renderPublicGeneratedAgreementPdf } from "@/server/services/public-agreement-pdf.service";
import { getPublicGeneratedAgreementForDownload } from "@/server/services/public-agreement-generator.service";

type PublicAgreementDownloadRouteProps = {
  params: Promise<{
    agreementId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: PublicAgreementDownloadRouteProps,
) {
  const { agreementId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { message: "Agreement download token is required." },
      { status: 400 },
    );
  }

  const agreement = await getPublicGeneratedAgreementForDownload({
    agreementId,
    token,
  });

  const pdfBuffer = await renderPublicGeneratedAgreementPdf(agreement);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${agreement.agreement_title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${agreement.id}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
