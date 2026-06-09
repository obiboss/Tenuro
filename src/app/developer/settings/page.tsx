import { DeveloperDocumentTemplateForm } from "@/components/developer/developer-document-template-form";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getDeveloperDocumentTemplateSettingsForCurrentDeveloper } from "@/server/services/developer-document-templates.service";
import { DEVELOPER_TEMPLATE_PLACEHOLDERS } from "@/constants/developer-document-templates";

export default async function DeveloperSettingsPage() {
  const settings =
    await getDeveloperDocumentTemplateSettingsForCurrentDeveloper();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Settings"
        description="Manage document templates and default document records for developer sales."
      />

      <SectionCard
        title="Default Sale Documents"
        description="BOPA tracks document copies and physical original handover separately. Digital copies are for reference and records only."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {settings.documentDefinitions.map((document) => (
            <div
              key={document.type}
              className="rounded-button bg-background p-4"
            >
              <p className="font-black text-text-strong">{document.label}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                {document.description}
              </p>
              <p className="mt-3 text-xs font-black uppercase tracking-wide text-primary">
                {document.defaultPortalStatus}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Auto-fill Placeholders"
        description="These placeholders reduce repeated typing. BOPA will replace them with buyer, plot, estate, sale, and payment details during document generation."
      >
        <div className="flex flex-wrap gap-2">
          {DEVELOPER_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
            <span
              key={placeholder}
              className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary"
            >
              {placeholder}
            </span>
          ))}
        </div>
      </SectionCard>

      <div className="space-y-5">
        {settings.editableTemplates.map((template) => (
          <DeveloperDocumentTemplateForm
            key={template.templateType}
            template={template}
          />
        ))}
      </div>
    </div>
  );
}
