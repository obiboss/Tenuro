import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getGatewayPaymentIntentByReference } from "@/server/repositories/gateway-payment.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";

export async function getCurrentLandlordPaymentVerification(reference: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const intent = await getGatewayPaymentIntentByReference(supabase, reference);

  if (!intent) {
    return null;
  }

  if (intent.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN_PAYMENT_VERIFY",
      "You do not have permission to view this payment.",
      403,
    );
  }

  return intent;
}
