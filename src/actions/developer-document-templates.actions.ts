"use server";

import { revalidatePath } from "next/cache";
import {
  resetDeveloperDocumentTemplateForCurrentDeveloper,
  saveDeveloperDocumentTemplateForCurrentDeveloper,
} from "@/server/services/developer-document-templates.service";

export async function saveDeveloperDocumentTemplateAction(formData: FormData) {
  const templateType = String(formData.get("templateType") ?? "").trim();
  const templateBody = String(formData.get("templateBody") ?? "").trim();

  await saveDeveloperDocumentTemplateForCurrentDeveloper({
    templateType,
    templateBody,
  });

  revalidatePath("/developer/settings");
}

export async function resetDeveloperDocumentTemplateAction(formData: FormData) {
  const templateType = String(formData.get("templateType") ?? "").trim();

  await resetDeveloperDocumentTemplateForCurrentDeveloper(templateType);

  revalidatePath("/developer/settings");
}
