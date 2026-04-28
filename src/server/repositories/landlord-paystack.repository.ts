import type { SupabaseClient } from "@supabase/supabase-js";
import type { LandlordPaystackAccount } from "@/server/types/paystack.types";

const LANDLORD_PAYSTACK_ACCOUNT_SELECT = `
  id,
  landlord_id,
  business_name,
  bank_code,
  bank_name,
  account_number,
  account_name,
  paystack_subaccount_code,
  paystack_subaccount_id,
  paystack_split_code,
  paystack_split_id,
  currency_code,
  is_active,
  verified_at,
  created_at,
  updated_at
`;

export async function getActiveLandlordPaystackAccount(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("landlord_paystack_accounts")
    .select(LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .eq("landlord_id", landlordId)
    .eq("is_active", true)
    .maybeSingle<LandlordPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function deactivateLandlordPaystackAccounts(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { error } = await supabase
    .from("landlord_paystack_accounts")
    .update({
      is_active: false,
    })
    .eq("landlord_id", landlordId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }
}

export async function createLandlordPaystackAccount(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    businessName: string;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    paystackSubaccountCode: string;
    paystackSubaccountId: number | null;
    paystackSplitCode: string | null;
    paystackSplitId: number | null;
    currencyCode: string;
  },
) {
  const { data, error } = await supabase
    .from("landlord_paystack_accounts")
    .insert({
      landlord_id: params.landlordId,
      business_name: params.businessName,
      bank_code: params.bankCode,
      bank_name: params.bankName,
      account_number: params.accountNumber,
      account_name: params.accountName,
      paystack_subaccount_code: params.paystackSubaccountCode,
      paystack_subaccount_id: params.paystackSubaccountId,
      paystack_split_code: params.paystackSplitCode,
      paystack_split_id: params.paystackSplitId,
      currency_code: params.currencyCode,
      is_active: true,
    })
    .select(LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .single<LandlordPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}
