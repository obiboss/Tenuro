"use server";

import { revalidatePath } from "next/cache";
import { generateSalesAgreementForCurrentDeveloper } from "@/server/services/developer-sale-documents.service";

export async function generateSalesAgreementAction(formData: FormData) {
  const saleId = String(formData.get("saleId") ?? "");

  if (!saleId) {
    return;
  }

  await generateSalesAgreementForCurrentDeveloper({
    saleId,
  });

  revalidatePath(`/developer/sales/${saleId}`);
}
