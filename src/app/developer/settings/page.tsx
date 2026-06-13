import { DeveloperDocumentTemplateForm } from "@/components/developer/developer-document-template-form";
import { DeveloperPayoutSetupForm } from "@/components/developer/developer-payout-setup-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
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
    return "Not verified";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPayoutBadge(
  state: Awaited<
    ReturnType<typeof getCurrentDeveloperPayoutAccountState>
  >["state"],
) {
  if (state === "verified") {
    return {
      label: "Verified",
      tone: "success" as const,
      guidance:
        "Your payout account is verified. You can send buyer purchase links.",
    };
  }

  if (state === "failed") {
    return {
      label: "Verification Failed",
      tone: "danger" as const,
      guidance:
        "Your payout account could not be approved. Submit corrected bank details for another review.",
    };
  }

  if (state === "unverified") {
    return {
      label: "Pending Verification",
      tone: "warning" as const,
      guidance:
        "Your payout account is awaiting BOPA admin verification. Buyer purchase links stay locked until approval.",
    };
  }

  return {
    label: "Required",
    tone: "warning" as const,
    guidance:
      "Add your payout bank account before sending buyer purchase links.",
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

  const payoutBadge = getPayoutBadge(payoutState.state);
  const paystackAccount = payoutState.paystackAccount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Settings"
        description="Manage payout readiness, document templates, and default document records for developer sales."
      />

      <div id="payout-account">
        <SectionCard
          title="Developer Payout Account"
          description="Buyer purchase links are locked until your payout bank account is submitted and verified by BOPA admin."
          action={<Badge tone={payoutBadge.tone}>{payoutBadge.label}</Badge>}
        >
          {paystackAccount ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-button bg-background p-4">
                <p className="text-sm font-bold text-text-muted">Bank</p>
                <p className="mt-2 font-black text-text-strong">
                  {paystackAccount.bank_name}
                </p>
              </div>

              <div className="rounded-button bg-background p-4">
                <p className="text-sm font-bold text-text-muted">
                  Account Number
                </p>
                <p className="mt-2 font-black text-text-strong">
                  {maskAccountNumber(paystackAccount.account_number)}
                </p>
              </div>

              <div className="rounded-button bg-background p-4">
                <p className="text-sm font-bold text-text-muted">
                  Account Name
                </p>
                <p className="mt-2 font-black text-text-strong">
                  {paystackAccount.account_name}
                </p>
              </div>

              <div className="rounded-button bg-background p-4">
                <p className="text-sm font-bold text-text-muted">Verified</p>
                <p className="mt-2 font-black text-text-strong">
                  {formatDateTime(paystackAccount.verified_at)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold leading-6 text-text-muted">
              No developer payout account has been submitted yet.
            </p>
          )}

          <div className="mt-5 rounded-button bg-primary-soft px-4 py-3 text-sm font-semibold leading-6 text-text-strong">
            {payoutBadge.guidance}
          </div>
        </SectionCard>
      </div>

      {payoutState.state !== "verified" ? (
        <SectionCard
          title={
            payoutState.state === "failed"
              ? "Update Payout Account"
              : "Submit Payout Account"
          }
          description="BOPA verifies your bank account with Paystack before saving it. Admin approval is required before buyer purchase links can be sent."
        >
          <DeveloperPayoutSetupForm banks={banks} />
        </SectionCard>
      ) : null}

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
