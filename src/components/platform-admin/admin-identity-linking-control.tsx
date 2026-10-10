import { updatePublicDocumentIdentityLinkingAction } from "@/actions/public-document-settings.actions";

export function AdminIdentityLinkingControl({ enabled }: { enabled: boolean }) {
  return (
    <section className="rounded-[18px] bg-white p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight text-text-strong">
              Identity linking
            </h2>
            <span
              className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-extrabold ${
                enabled
                  ? "bg-success/10 text-success"
                  : "bg-[#f1efeb] text-text-muted"
              }`}
            >
              {enabled ? "On" : "Off"}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-medium text-text-muted">
            When on, identities with the same normalized phone or property
            address share one free allowance and paid balance per document type.
            Ambiguous matches are held for review.
          </p>
        </div>

        <form action={updatePublicDocumentIdentityLinkingAction}>
          <input
            type="hidden"
            name="enabled"
            value={enabled ? "false" : "true"}
          />
          <button
            type="submit"
            className={`min-h-11 rounded-xl px-5 text-sm font-extrabold transition ${
              enabled
                ? "border border-border-soft bg-white text-text-strong hover:bg-[#f7f5f2]"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            {enabled ? "Turn off" : "Turn on"}
          </button>
        </form>
      </div>
    </section>
  );
}
