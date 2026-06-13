import { DeveloperDocumentTemplateForm } from "@/components/developer/developer-document-template-form";
import { DeveloperPayoutSetupForm } from "@/components/developer/developer-payout-setup-form";
import { Badge } from "@/components/ui/badge";
import { DEVELOPER_TEMPLATE_PLACEHOLDERS } from "@/constants/developer-document-templates";
import { requireDeveloper } from "@/server/services/auth.service";
import { getDeveloperDocumentTemplateSettingsForCurrentDeveloper } from "@/server/services/developer-document-templates.service";
import {
  getCurrentDeveloperPayoutAccountState,
  getPaystackBanksForDeveloperSetup,
} from "@/server/services/developer-payout.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

function maskAccountNumber(accountNumber: string) {
  const trimmed = accountNumber.trim();

  if (trimmed.length <= 4) {
    return trimmed;
  }

  return `${"*".repeat(Math.max(trimmed.length - 4, 0))}${trimmed.slice(-4)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not approved yet";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPayoutPresentation(
  state: Awaited<
    ReturnType<typeof getCurrentDeveloperPayoutAccountState>
  >["state"],
) {
  if (state === "verified") {
    return {
      label: "Approved",
      tone: "success" as const,
      title: "Your bank account is ready",
      description:
        "You can now send buyer purchase links and receive payments into your approved bank account.",
      guidance:
        "Buyer payments will be processed securely. Your sale amount goes to your approved bank account, while BOPA keeps only the processing fee.",
    };
  }

  if (state === "failed") {
    return {
      label: "Needs correction",
      tone: "danger" as const,
      title: "Your bank account needs attention",
      description:
        "The bank details could not be approved. Please submit the correct account details again.",
      guidance:
        "Use an account that belongs to your company or authorized business representative.",
    };
  }

  if (state === "unverified") {
    return {
      label: "Under review",
      tone: "warning" as const,
      title: "Your bank account is being reviewed",
      description:
        "BOPA is checking your submitted bank account before buyer payment links can be sent.",
      guidance:
        "You can continue managing estates, plots, buyers, and sales while this review is pending.",
    };
  }

  return {
    label: "Required",
    tone: "warning" as const,
    title: "Add where you want to receive buyer payments",
    description:
      "Before you send a buyer payment link, add the bank account where your sale payments should be settled.",
    guidance:
      "This protects buyers, protects your business, and ensures payments are routed correctly.",
  };
}

export default async function DeveloperSettingsPage() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();

  const [settings, payoutState, banks] = await Promise.all([
    getDeveloperDocumentTemplateSettingsForCurrentDeveloper(),
    getCurrentDeveloperPayoutAccountState({
      supabase,
      developerProfileId: developer.id,
    }),
    getPaystackBanksForDeveloperSetup(),
  ]);

  const payout = getPayoutPresentation(payoutState.state);
  const paystackAccount = payoutState.paystackAccount;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
        <div className="bg-primary px-5 py-6 text-white sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-extrabold uppercase tracking-wide text-white/75">
                Payment setup
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Set up your bank account
              </h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/85 sm:text-base">
                Add the bank account where you want to receive buyer payments.
                BOPA will review it before buyer payment links can be sent.
              </p>
            </div>

            <Badge tone={payout.tone}>{payout.label}</Badge>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-card bg-primary-soft p-5">
            <h2 className="text-lg font-black text-text-strong">
              {payout.title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              {payout.description}
            </p>

            <div className="mt-5 rounded-button bg-white px-4 py-3 text-sm font-bold leading-6 text-text-strong shadow-soft">
              {payout.guidance}
            </div>
          </div>

          <div className="rounded-card border border-border-soft bg-background p-5">
            <p className="text-sm font-black text-text-strong">How it works</p>

            <div className="mt-4 space-y-3">
              {[
                "You submit your bank account.",
                "BOPA checks and approves the account.",
                "Buyer purchase links become available.",
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm font-semibold leading-6 text-text-muted">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="payout-account"
        className="scroll-mt-24 rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-7"
      >
        <div className="flex flex-col gap-3 border-b border-border-soft pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-text-strong">
              Bank account for buyer payments
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
              This is the account BOPA will use when routing your buyer
              payments. Buyer links remain locked until this account is
              approved.
            </p>
          </div>

          <Badge tone={payout.tone}>{payout.label}</Badge>
        </div>

        {paystackAccount ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-button bg-background p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Bank
              </p>
              <p className="mt-2 font-black text-text-strong">
                {paystackAccount.bank_name}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Account number
              </p>
              <p className="mt-2 font-black text-text-strong">
                {maskAccountNumber(paystackAccount.account_number)}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Account name
              </p>
              <p className="mt-2 font-black text-text-strong">
                {paystackAccount.account_name}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Approval
              </p>
              <p className="mt-2 font-black text-text-strong">
                {formatDateTime(paystackAccount.verified_at)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-button bg-background p-5">
            <p className="text-sm font-bold leading-6 text-text-muted">
              No bank account has been submitted yet.
            </p>
          </div>
        )}
      </section>

      {payoutState.state !== "verified" ? (
        <section className="rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-7">
          <div className="border-b border-border-soft pb-5">
            <h2 className="text-xl font-black tracking-tight text-text-strong">
              {payoutState.state === "failed"
                ? "Submit corrected bank details"
                : "Add bank account"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
              Enter the bank account where your buyer payments should be
              received. BOPA will confirm the account name before saving it for
              review.
            </p>
          </div>

          <div className="mt-6">
            <DeveloperPayoutSetupForm banks={banks} />
          </div>
        </section>
      ) : null}

      <section className="rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-7">
        <div className="border-b border-border-soft pb-5">
          <h2 className="text-xl font-black tracking-tight text-text-strong">
            Sale documents
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
            These are the standard documents BOPA helps you organize for each
            buyer. Digital copies are for records; original documents are still
            handled according to your business process.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {settings.documentDefinitions.map((document) => (
            <div
              key={document.type}
              className="rounded-button border border-border-soft bg-background p-4"
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
      </section>

      <section className="rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-7">
        <div className="border-b border-border-soft pb-5">
          <h2 className="text-xl font-black tracking-tight text-text-strong">
            Document auto-fill fields
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
            BOPA can automatically fill buyer, estate, plot, sale, and payment
            details into your document templates.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {DEVELOPER_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
            <span
              key={placeholder}
              className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary"
            >
              {placeholder}
            </span>
          ))}
        </div>
      </section>

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
