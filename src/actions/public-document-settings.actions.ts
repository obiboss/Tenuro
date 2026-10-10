"use server";

import { revalidatePath } from "next/cache";
import { setPublicDocumentIdentityLinkingSetting } from "@/server/services/platform-admin-free-tools.service";

export async function updatePublicDocumentIdentityLinkingAction(
  formData: FormData,
) {
  await setPublicDocumentIdentityLinkingSetting(
    formData.get("enabled") === "true",
  );
  revalidatePath("/admin/free-tools");
}
