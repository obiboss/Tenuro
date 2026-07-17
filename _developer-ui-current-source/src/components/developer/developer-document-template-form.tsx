import {
  resetDeveloperDocumentTemplateAction,
  saveDeveloperDocumentTemplateAction,
} from "@/actions/developer-document-templates.actions";
import type { DeveloperEditableTemplateType } from "@/constants/developer-document-templates";

type DeveloperDocumentTemplateFormProps = {
  template: {
    templateType: DeveloperEditableTemplateType;
    label: string;
    description: string;
    templateName: string;
    templateBody: string;
    isDefaultCopy: boolean;
    isPersisted: boolean;
  };
};

export function DeveloperDocumentTemplateForm({
  template,
}: DeveloperDocumentTemplateFormProps) {
  return (
    <div className="rounded-card border border-border-soft bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-black text-text-strong">
            {template.label}
          </p>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-text-muted">
            {template.description}
          </p>
        </div>

        <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
          {template.isDefaultCopy ? "BOPA default" : "Custom"}
        </span>
      </div>

      <form action={saveDeveloperDocumentTemplateAction} className="mt-5">
        <input
          type="hidden"
          name="templateType"
          value={template.templateType}
        />

        <label className="text-sm font-black text-text-strong">
          Editable template content
        </label>

        <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
          Use placeholders like {"{{buyer_full_name}}"}, {"{{estate_name}}"},{" "}
          {"{{plot_number}}"}, and {"{{total_price_locked}}"}. BOPA will
          auto-fill them from the sale record during document generation.
        </p>

        <textarea
          name="templateBody"
          defaultValue={template.templateBody}
          rows={24}
          className="mt-3 w-full rounded-button border border-border-soft bg-background px-4 py-3 font-mono text-sm leading-6 text-text-strong outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
          >
            Save Template
          </button>

          <button
            formAction={resetDeveloperDocumentTemplateAction}
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
          >
            Restore BOPA Default
          </button>
        </div>
      </form>
    </div>
  );
}
