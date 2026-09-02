import { NextResponse } from "next/server";
import { verifyPublicDocumentPayment } from "@/server/services/public-document-payment.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const product = url.searchParams.get("product");
  const reference = url.searchParams.get("reference");

  if (
    (product !== "receipt" && product !== "tenancy_agreement") ||
    !reference
  ) {
    return NextResponse.json({ message: "Payment reference is required." }, { status: 400 });
  }

  const result = await verifyPublicDocumentPayment({
    product,
    reference,
  });
  return NextResponse.json(result);
}