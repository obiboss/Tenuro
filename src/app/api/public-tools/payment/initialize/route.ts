import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import {
  createPublicDocumentIdentityFingerprint,
  type PublicDocumentProduct,
} from "@/server/services/public-document-entitlement.service";
import { initializePublicDocumentPayment } from "@/server/services/public-document-payment.service";
import { trackPublicDocumentPaymentIntent } from "@/server/services/public-document-payment-tracking.service";

function describeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
      code: typeof record.code === "string" ? record.code : undefined,
      details: typeof record.details === "string" ? record.details : undefined,
      hint: typeof record.hint === "string" ? record.hint : undefined,
    };
  }

  return { message: String(error) };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
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

    console.info("[PUBLIC_PAYMENT_INIT_REQUEST]", {
      requestId,
      product,
      emailPresent: Boolean(email),
      landlordFullNamePresent: Boolean(landlordFullName),
      landlordPhoneNumberPresent: Boolean(landlordPhoneNumber),
      propertyAddressPresent: Boolean(propertyAddress),
    });

    if (
      (product !== "receipt" && product !== "tenancy_agreement") ||
      !email ||
      !landlordFullName ||
      !landlordPhoneNumber ||
      !propertyAddress
    ) {
      return NextResponse.json(
        { message: "Payment details are incomplete.", requestId },
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }

    const identityFingerprint = createPublicDocumentIdentityFingerprint({
      landlordFullName,
      landlordPhoneNumber,
      propertyAddress,
    });
    const result = await initializePublicDocumentPayment({
      product: product as PublicDocumentProduct,
      email,
      identityFingerprint,
    });

    await trackPublicDocumentPaymentIntent({
      reference: result.reference,
      identityFingerprint,
      product: product as PublicDocumentProduct,
    });

    console.info("[PUBLIC_PAYMENT_INIT_SUCCESS]", {
      requestId,
      product,
      reference: result.reference,
    });

    return NextResponse.json(result, {
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    console.error("[PUBLIC_PAYMENT_INIT_ERROR]", {
      requestId,
      code: isAppError(error) ? error.code : "UNEXPECTED_ERROR",
      status: isAppError(error) ? error.status : 500,
      error: describeError(error),
    });

    if (isAppError(error)) {
      return NextResponse.json(
        { message: error.userMessage, code: error.code, requestId },
        { status: error.status, headers: { "x-request-id": requestId } },
      );
    }

    return NextResponse.json(
      {
        message: "Payment initialization failed. Please try again.",
        code: "PUBLIC_PAYMENT_INITIALIZATION_FAILED",
        requestId,
      },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
