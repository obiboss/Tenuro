import { NextResponse } from "next/server";
import {
  createPublicDocumentIdentityFingerprint,
  type PublicDocumentProduct,
} from "@/server/services/public-document-entitlement.service";
import { initializePublicDocumentPayment } from "@/server/services/public-document-payment.service";
import { trackPublicDocumentPaymentIntent } from "@/server/services/public-document-payment-tracking.service";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const product = body?.product;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const landlordFullName =
    typeof body?.landlordFullName === "string" ? body.landlordFullName : "";
  const landlordPhoneNumber =
    typeof body?.landlordPhoneNumber === "string"
      ? body.landlordPhoneNumber
      : "";
  const propertyAddress =
    typeof body?.propertyAddress === "string" ? body.propertyAddress : "";

  if (
    (product !== "receipt" && product !== "tenancy_agreement") ||
    !email ||
    !landlordFullName ||
    !landlordPhoneNumber ||
    !propertyAddress
  ) {
    return NextResponse.json(
      { message: "Payment details are incomplete." },
      { status: 400 },
    );
  }

  const result = await initializePublicDocumentPayment({
    product: product as PublicDocumentProduct,
    email,
    identityFingerprint: createPublicDocumentIdentityFingerprint({
      landlordFullName,
      landlordPhoneNumber,
      propertyAddress,
    }),
  });

  await trackPublicDocumentPaymentIntent({
    reference: result.reference,
    identityFingerprint: createPublicDocumentIdentityFingerprint({
      landlordFullName,
      landlordPhoneNumber,
      propertyAddress,
    }),
    product: product as PublicDocumentProduct,
  });

  return NextResponse.json(result);
}
