"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAgreementTemplateAction } from "@/actions/agreement-templates.actions";
import { initialAgreementTemplateActionState } from "@/actions/agreement-templates.state";
import {
  DEFAULT_LANDLORD_AGREEMENT_TEMPLATE,
  renderAgreementTemplate,
  type AgreementTemplateRenderContext,
} from "@/lib/agreement-template-default";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AgreementTemplateEditorProps = {
  scope: "landlord" | "property";
  propertyId?: string | null;
  propertyName?: string | null;
  name: string;
  templateBody: string;
};

type AgreementSection = {
  title: string;
  body: string;
};

type ParsedAgreement = {
  introduction: string;
  sections: AgreementSection[];
  signatures: string;
};

const OPTIONAL_CLAUSES = [
  {
    id: "security-deposit",
    title: "CAUTION / SECURITY DEPOSIT",
    label: "Caution or security deposit",
    description:
      "Sets the conditions for returning a caution or security deposit.",
  },
  {
    id: "property-requirements",
    title: "PROPERTY REQUIREMENTS",
    label: "Property rules",
    description:
      "Includes the rules selected for the property in the agreement.",
  },
  {
    id: "inspection",
    title: "INSPECTION",
    label: "Property inspection",
    description:
      "Allows an inspection after reasonable notice, except in an emergency.",
  },
  {
    id: "special-terms",
    title: "SPECIAL TERMS",
    label: "Special terms",
    description: "Includes any extra terms recorded for a particular tenancy.",
  },
] as const;

type OptionalClauseId = (typeof OPTIONAL_CLAUSES)[number]["id"];

const AGREEMENT_SECTION_HEADING = /^(\d+)\.\s+([A-Z][A-Z0-9\s/’'&()-]+)\s*$/gm;

const SAMPLE_AGREEMENT_DETAILS: AgreementTemplateRenderContext = {
  landlordName: "John Doe",
  landlordPhone: "080XXXXXXXX",
  landlordEmail: "john.doe@example.com",
  tenantName: "Ada Okafor",
  tenantPhone: "081XXXXXXXX",
  tenantEmail: "ada.okafor@example.com",
  propertyName: "Greenview Apartments",
  propertyAddress: "10 Example Street, Lagos",
  unitIdentifier: "Flat 2B",
  rentAmount: "₦1,200,000",
  rentFrequency: "year",
  startDate: "1 January 2027",
  endDate: "31 December 2027",
  propertyRequirements:
    "1. Keep shared areas clean.\n2. Avoid loud noise after 10:00 p.m.",
  specialTerms: "No additional terms have been added.",
};

function normalizeSectionTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toUpperCase();
}

function parseAgreementTemplate(template: string): ParsedAgreement {
  const signatureMatch = /\nSIGNED:\s*/i.exec(template);
  const mainAgreement = signatureMatch
    ? template.slice(0, signatureMatch.index)
    : template;
  const signatures = signatureMatch
    ? template.slice(signatureMatch.index + 1).trim()
    : "";
  const headingMatches = Array.from(
    mainAgreement.matchAll(AGREEMENT_SECTION_HEADING),
  );

  if (headingMatches.length === 0) {
    return {
      introduction: mainAgreement.trim(),
      sections: [],
      signatures,
    };
  }

  const sections = headingMatches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = headingMatches[index + 1]?.index ?? mainAgreement.length;

    return {
      title: normalizeSectionTitle(match[2]),
      body: mainAgreement.slice(start, end).trim(),
    };
  });

  return {
    introduction: mainAgreement.slice(0, headingMatches[0].index ?? 0).trim(),
    sections,
    signatures,
  };
}

function getSelectedOptionalClauseIds(template: string): OptionalClauseId[] {
  const sectionTitles = new Set(
    parseAgreementTemplate(template).sections.map((section) => section.title),
  );

  return OPTIONAL_CLAUSES.filter((clause) =>
    sectionTitles.has(clause.title),
  ).map((clause) => clause.id);
}

function buildAgreementWithSelectedClauses(
  template: string,
  selectedClauseIds: OptionalClauseId[],
) {
  const currentAgreement = parseAgreementTemplate(template);
  const defaultAgreement = parseAgreementTemplate(
    DEFAULT_LANDLORD_AGREEMENT_TEMPLATE,
  );

  if (currentAgreement.sections.length === 0) {
    return template;
  }

  const selectedIds = new Set(selectedClauseIds);
  const optionalClauseByTitle = new Map<
    string,
    (typeof OPTIONAL_CLAUSES)[number]
  >(OPTIONAL_CLAUSES.map((clause) => [clause.title, clause]));
  const defaultOrder = new Map(
    defaultAgreement.sections.map((section, index) => [section.title, index]),
  );
  const sections = currentAgreement.sections.filter((section) => {
    const optionalClause = optionalClauseByTitle.get(section.title);

    return !optionalClause || selectedIds.has(optionalClause.id);
  });

  for (const clause of OPTIONAL_CLAUSES) {
    if (
      !selectedIds.has(clause.id) ||
      sections.some((section) => section.title === clause.title)
    ) {
      continue;
    }

    const defaultSection = defaultAgreement.sections.find(
      (section) => section.title === clause.title,
    );

    if (!defaultSection) {
      continue;
    }

    const clauseOrder =
      defaultOrder.get(clause.title) ?? Number.MAX_SAFE_INTEGER;
    const insertionIndex = sections.findIndex(
      (section) =>
        (defaultOrder.get(section.title) ?? Number.MAX_SAFE_INTEGER) >
        clauseOrder,
    );

    if (insertionIndex === -1) {
      sections.push(defaultSection);
    } else {
      sections.splice(insertionIndex, 0, defaultSection);
    }
  }

  const numberedSections = sections
    .map(
      (section, index) => `${index + 1}. ${section.title}\n\n${section.body}`,
    )
    .join("\n\n");

  return [
    currentAgreement.introduction,
    numberedSections,
    currentAgreement.signatures,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function AgreementTemplateEditor({
  scope,
  propertyId,
  propertyName,
  name,
  templateBody,
}: AgreementTemplateEditorProps) {
  const [state, formAction, isPending] = useActionState(
    saveAgreementTemplateAction,
    initialAgreementTemplateActionState,
  );
  const [selectedClauseIds, setSelectedClauseIds] = useState<
    OptionalClauseId[]
  >(() => getSelectedOptionalClauseIds(templateBody));
  const updatedTemplate = useMemo(
    () => buildAgreementWithSelectedClauses(templateBody, selectedClauseIds),
    [selectedClauseIds, templateBody],
  );
  const agreementPreview = useMemo(
    () => renderAgreementTemplate(updatedTemplate, SAMPLE_AGREEMENT_DETAILS),
    [updatedTemplate],
  );

  function toggleClause(clauseId: OptionalClauseId) {
    setSelectedClauseIds((currentClauseIds) =>
      currentClauseIds.includes(clauseId)
        ? currentClauseIds.filter((id) => id !== clauseId)
        : [...currentClauseIds, clauseId],
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Agreement choices saved"
        errorTitle="Could not save agreement choices"
      />

      {propertyId ? (
        <input type="hidden" name="propertyId" value={propertyId} />
      ) : null}
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="templateBody" value={updatedTemplate} />

      <div className="rounded-card border border-border-soft bg-primary-soft/40 p-4 sm:p-5">
        <p className="font-black text-text-strong">
          {scope === "property"
            ? `Agreement for ${propertyName ?? "this property"}`
            : "Your standard tenancy agreement"}
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Read the complete sample below and choose the optional sections you
          want to include.
        </p>
      </div>

      <section aria-labelledby="optional-agreement-sections">
        <div className="mb-3">
          <h3
            id="optional-agreement-sections"
            className="text-lg font-black text-text-strong"
          >
            Optional sections
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            The main tenancy terms remain in every agreement.
          </p>
        </div>

        <div className="overflow-hidden rounded-card border border-border-soft bg-white">
          {OPTIONAL_CLAUSES.map((clause) => {
            const isIncluded = selectedClauseIds.includes(clause.id);

            return (
              <div
                key={clause.id}
                className="flex flex-col gap-4 border-b border-border-soft p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-text-strong">
                      {clause.label}
                    </p>
                    <Badge tone={isIncluded ? "success" : "neutral"}>
                      {isIncluded ? "Included" : "Not included"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    {clause.description}
                  </p>
                </div>

                <Button
                  type="button"
                  variant={isIncluded ? "secondary" : "primary"}
                  size="sm"
                  className="shrink-0 sm:min-w-28"
                  aria-pressed={isIncluded}
                  onClick={() => toggleClause(clause.id)}
                >
                  {isIncluded ? "Remove" : "Add"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="agreement-preview-heading">
        <h3
          id="agreement-preview-heading"
          className="mb-3 text-lg font-black text-text-strong"
        >
          Agreement sample
        </h3>
        <div className="max-h-[42rem] overflow-y-auto rounded-card border border-border-soft bg-white px-4 py-5 text-sm font-medium leading-7 whitespace-pre-wrap text-text-strong sm:px-6 sm:py-6">
          {agreementPreview}
        </div>
      </section>

      {state.fieldErrors?.templateBody?.[0] ? (
        <p className="text-sm font-bold text-danger" role="alert">
          {state.fieldErrors.templateBody[0]}
        </p>
      ) : null}

      <Button type="submit" isLoading={isPending} fullWidth>
        Save agreement choices
      </Button>
    </form>
  );
}
