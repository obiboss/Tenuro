import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getGatewayPaymentIntentByReference } from "@/server/repositories/gateway-payment.repository";
import { shouldVerifyGatewayIntentWithPaystack } from "@/server/services/gateway-payment-idempotency.service";
import { processVerifiedGatewayPaymentReference } from "@/server/services/gateway-payment-webhook.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlordPlatformOperator } from "./auth.service";

export async function getCurrentLandlordPaymentVerification(reference: string) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const initialIntent = await getGatewayPaymentIntentByReference(
    supabase,
    reference,
  );

  if (!initialIntent) {
    return null;
  }

  if (initialIntent.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN_PAYMENT_VERIFY",
      "You do not have permission to view this payment.",
      403,
    );
  }

  if (shouldVerifyGatewayIntentWithPaystack(initialIntent)) {
    await processVerifiedGatewayPaymentReference(reference, {
      replaySource: "landlord_verify",
    });
  }

  const refreshedIntent = await getGatewayPaymentIntentByReference(
    supabase,
    reference,
  );

  return refreshedIntent ?? initialIntent;
}
