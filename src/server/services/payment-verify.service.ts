import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getGatewayPaymentIntentByReference } from "@/server/repositories/gateway-payment.repository";
import { processVerifiedGatewayPaymentReference } from "@/server/services/gateway-payment-webhook.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";

export async function getCurrentLandlordPaymentVerification(reference: string) {
  const landlord = await requireLandlord();
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

  if (initialIntent.status === "initialized") {
    await processVerifiedGatewayPaymentReference(reference);
  }

  const refreshedIntent = await getGatewayPaymentIntentByReference(
    supabase,
    reference,
  );

  return refreshedIntent ?? initialIntent;
}
