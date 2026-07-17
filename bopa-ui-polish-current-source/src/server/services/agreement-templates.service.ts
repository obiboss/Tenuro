import "server-only";

import {
  DEFAULT_LANDLORD_AGREEMENT_TEMPLATE,
  renderAgreementTemplate,
  type AgreementTemplateRenderContext,
} from "@/lib/agreement-template-default";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getPropertyById } from "@/server/repositories/properties.repository";
import type { PropertyRuleDetailRow } from "@/server/repositories/property-rules.repository";
import {
  getLandlordDefaultAgreementTemplate,
  getPropertyDefaultAgreementTemplate,
  listAgreementTemplatesForLandlord,
  upsertLandlordDefaultAgreementTemplate,
  upsertPropertyDefaultAgreementTemplate,
} from "@/server/repositories/agreement-templates.repository";
import type { TenancyDetailRow } from "@/server/repositories/tenancies.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { buildPropertyRequirementClauses } from "@/server/services/tenancy-agreement-template.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { SaveAgreementTemplateInput } from "@/server/validators/agreement-template.schema";
import { requireLandlord } from "./auth.service";

function formatDate(value: string | null) {
  if (!value) {
    return "____________________";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(value));
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function paymentFrequencyLabel(value: string) {
  const labels: Record<string, string> = {
    annual: "year",
    monthly: "month",
    quarterly: "quarter",
    biannual: "six months",
  };

  return labels[value] ?? value;
}

function buildAgreementRenderContext(params: {
  landlord: {
    fullName: string;
    phoneNumber: string | null;
    email: string | null;
  };
  tenancy: TenancyDetailRow;
  propertyRules?: PropertyRuleDetailRow[];
}): AgreementTemplateRenderContext {
  const tenant = params.tenancy.tenants;
  const unit = params.tenancy.units;
  const property = unit?.properties;

  return {
    landlordName: params.landlord.fullName,
    landlordPhone: params.landlord.phoneNumber ?? "____________________",
    landlordEmail: params.landlord.email ?? "____________________",
    tenantName: tenant?.full_name ?? "____________________",
    tenantPhone: tenant?.phone_number ?? "____________________",
    tenantEmail: tenant?.email ?? "____________________",
    propertyName: property?.property_name ?? "____________________",
    propertyAddress: property?.address ?? "____________________",
    unitIdentifier: unit?.unit_identifier ?? "____________________",
    rentAmount: formatMoney(
      params.tenancy.rent_amount,
      params.tenancy.currency_code,
    ),
    rentFrequency: paymentFrequencyLabel(params.tenancy.payment_frequency),
    startDate: formatDate(params.tenancy.start_date),
    endDate: formatDate(params.tenancy.end_date),
    propertyRequirements: buildPropertyRequirementClauses(
      params.propertyRules ?? [],
    ),
    specialTerms: params.tenancy.agreement_notes || "No special terms added.",
  };
}

export async function getCurrentLandlordAgreementTemplates() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return listAgreementTemplatesForLandlord(supabase, landlord.id);
}

export async function getLandlordAgreementTemplateEditorState(params?: {
  propertyId?: string;
}) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  if (params?.propertyId) {
    const property = await getPropertyById(supabase, params.propertyId);

    if (property.landlord_id !== landlord.id) {
      throw new AppError(
        "FORBIDDEN",
        "You do not have permission to manage templates for this property.",
        403,
      );
    }

    const propertyTemplate = await getPropertyDefaultAgreementTemplate(supabase, {
      landlordId: landlord.id,
      propertyId: params.propertyId,
    });

    if (propertyTemplate) {
      return {
        scope: "property" as const,
        propertyId: params.propertyId,
        propertyName: property.property_name,
        name: propertyTemplate.name,
        templateBody: propertyTemplate.template_body,
      };
    }

    const landlordTemplate = await getLandlordDefaultAgreementTemplate(
      supabase,
      landlord.id,
    );

    return {
      scope: "property" as const,
      propertyId: params.propertyId,
      propertyName: property.property_name,
      name: `${property.property_name} agreement template`,
      templateBody:
        landlordTemplate?.template_body ?? DEFAULT_LANDLORD_AGREEMENT_TEMPLATE,
    };
  }

  const landlordTemplate = await getLandlordDefaultAgreementTemplate(
    supabase,
    landlord.id,
  );

  return {
    scope: "landlord" as const,
    propertyId: null,
    propertyName: null,
    name: landlordTemplate?.name ?? "Default tenancy agreement",
    templateBody:
      landlordTemplate?.template_body ?? DEFAULT_LANDLORD_AGREEMENT_TEMPLATE,
  };
}

export async function saveAgreementTemplateForCurrentLandlord(
  input: SaveAgreementTemplateInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const template = input.propertyId
    ? await upsertPropertyDefaultAgreementTemplate(supabase, {
        landlordId: landlord.id,
        propertyId: input.propertyId,
        name: input.name,
        templateBody: input.templateBody,
      })
    : await upsertLandlordDefaultAgreementTemplate(supabase, {
        landlordId: landlord.id,
        name: input.name,
        templateBody: input.templateBody,
      });

  await writeAuditLog({
    landlordId: landlord.id,
    propertyId: input.propertyId ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.agreementTemplateSaved,
    entityType: AUDIT_ENTITY_TYPES.agreementTemplate,
    entityId: template.id,
    description: input.propertyId
      ? "Property agreement template saved."
      : "Landlord agreement template saved.",
    metadata: {
      agreement_template_id: template.id,
      property_id: input.propertyId ?? null,
      template_name: template.name,
    },
  });

  return template;
}

export async function resolveAgreementTemplateBody(params: {
  landlordId: string;
  propertyId: string | null;
}) {
  const supabase = await createSupabaseServerClient();

  if (params.propertyId) {
    const propertyTemplate = await getPropertyDefaultAgreementTemplate(
      supabase,
      {
        landlordId: params.landlordId,
        propertyId: params.propertyId,
      },
    );

    if (propertyTemplate) {
      return {
        templateId: propertyTemplate.id,
        templateBody: propertyTemplate.template_body,
      };
    }
  }

  const landlordTemplate = await getLandlordDefaultAgreementTemplate(
    supabase,
    params.landlordId,
  );

  if (landlordTemplate) {
    return {
      templateId: landlordTemplate.id,
      templateBody: landlordTemplate.template_body,
    };
  }

  return {
    templateId: null,
    templateBody: DEFAULT_LANDLORD_AGREEMENT_TEMPLATE,
  };
}

export function buildAgreementFromTemplate(params: {
  templateBody: string;
  landlord: {
    fullName: string;
    phoneNumber: string | null;
    email: string | null;
  };
  tenancy: TenancyDetailRow;
  propertyRules?: PropertyRuleDetailRow[];
}) {
  const context = buildAgreementRenderContext(params);

  return renderAgreementTemplate(params.templateBody, context);
}
