import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  DEVELOPER_DOCUMENT_DEFINITIONS,
  getDefaultDeveloperTemplateBody,
  getDefaultDeveloperTemplateName,
  isDeveloperEditableTemplateType,
  type DeveloperEditableTemplateType,
} from "@/constants/developer-document-templates";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import {
  listDeveloperDocumentTemplates,
  upsertDeveloperDocumentTemplate,
  type DeveloperDocumentTemplateRow,
} from "@/server/repositories/developer-document-templates.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperDocumentTemplateView = {
  templateType: DeveloperEditableTemplateType;
  label: string;
  description: string;
  templateName: string;
  templateBody: string;
  isDefaultCopy: boolean;
  isPersisted: boolean;
};

function getEditableDefinitions() {
  return DEVELOPER_DOCUMENT_DEFINITIONS.filter(
    (
      definition,
    ): definition is typeof definition & {
      type: DeveloperEditableTemplateType;
    } => definition.isEditableTemplate,
  );
}

function mapTemplateRowsByType(rows: DeveloperDocumentTemplateRow[]) {
  return new Map(rows.map((row) => [row.template_type, row]));
}

async function getCurrentDeveloperAccount() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();

  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  if (!account || account.status !== "active") {
    throw new AppError(
      "DEVELOPER_ACCOUNT_NOT_ACTIVE",
      "Developer account is not active.",
      403,
    );
  }

  return {
    developer,
    account,
    supabase,
  };
}

export async function getDeveloperDocumentTemplateSettingsForCurrentDeveloper() {
  const { account, supabase } = await getCurrentDeveloperAccount();

  const templates = await listDeveloperDocumentTemplates(supabase, account.id);
  const templateMap = mapTemplateRowsByType(templates);

  const editableTemplates: DeveloperDocumentTemplateView[] =
    getEditableDefinitions().map((definition) => {
      const row = templateMap.get(definition.type);

      return {
        templateType: definition.type,
        label: definition.label,
        description: definition.description,
        templateName:
          row?.template_name ??
          getDefaultDeveloperTemplateName(definition.type),
        templateBody:
          row?.template_body ??
          getDefaultDeveloperTemplateBody(definition.type),
        isDefaultCopy: row?.is_default_copy ?? true,
        isPersisted: Boolean(row),
      };
    });

  return {
    developerAccount: account,
    documentDefinitions: DEVELOPER_DOCUMENT_DEFINITIONS,
    editableTemplates,
  };
}

export async function saveDeveloperDocumentTemplateForCurrentDeveloper(params: {
  templateType: string;
  templateBody: string;
}) {
  const templateType = params.templateType.trim();

  if (!isDeveloperEditableTemplateType(templateType)) {
    throw new AppError(
      "INVALID_TEMPLATE_TYPE",
      "Document template type is not valid.",
      400,
    );
  }

  const templateBody = params.templateBody.trim();

  if (templateBody.length < 100) {
    throw new AppError(
      "TEMPLATE_BODY_TOO_SHORT",
      "Template content is too short.",
      400,
    );
  }

  const { account, supabase } = await getCurrentDeveloperAccount();

  return upsertDeveloperDocumentTemplate(supabase, {
    developerAccountId: account.id,
    templateType,
    templateName: getDefaultDeveloperTemplateName(templateType),
    templateBody,
    isDefaultCopy: false,
  });
}

export async function resetDeveloperDocumentTemplateForCurrentDeveloper(
  templateType: string,
) {
  const normalizedTemplateType = templateType.trim();

  if (!isDeveloperEditableTemplateType(normalizedTemplateType)) {
    throw new AppError(
      "INVALID_TEMPLATE_TYPE",
      "Document template type is not valid.",
      400,
    );
  }

  const { account, supabase } = await getCurrentDeveloperAccount();

  return upsertDeveloperDocumentTemplate(supabase, {
    developerAccountId: account.id,
    templateType: normalizedTemplateType,
    templateName: getDefaultDeveloperTemplateName(normalizedTemplateType),
    templateBody: getDefaultDeveloperTemplateBody(normalizedTemplateType),
    isDefaultCopy: true,
  });
}
