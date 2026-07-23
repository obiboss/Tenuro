import { pdf } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { ManagerUnifiedPropertyReportPdf } from "@/server/pdf/manager-unified-property-report-pdf";
import { getManagerUnifiedReportData } from "@/server/services/manager-unified-report.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilePart(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "property";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await getManagerUnifiedReportData({
      landlordClientId: url.searchParams.get("landlordClientId"),
      propertyId: url.searchParams.get("propertyId"),
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
    });

    if (!data.snapshot) {
      return NextResponse.json(
        {
          ok: false,
          message: "Select a landlord and property before downloading the report.",
        },
        { status: 400 },
      );
    }

    const document = ManagerUnifiedPropertyReportPdf({
      snapshot: data.snapshot,
    });
    const blob = await pdf(document).toBlob();
    const fileBuffer = await blob.arrayBuffer();
    const fileName = `bopa-${safeFilePart(
      data.snapshot.landlord.landlord_name,
    )}-${safeFilePart(data.snapshot.property.property_name)}-${
      data.snapshot.period.dateFrom
    }-to-${data.snapshot.period.dateTo}.pdf`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("manager unified property report download failed", error);

    return NextResponse.json(
      {
        ok: false,
        message: "The property report could not be downloaded.",
      },
      { status: 500 },
    );
  }
}
