import Link from "next/link";
import { ArrowRight, Landmark, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { PlatformAdminPayoutVerificationAccount } from "@/server/services/platform-admin-payout-verification.service";

type AdminPayoutVerificationPreviewProps = {
  accounts: PlatformAdminPayoutVerificationAccount[];
  total: number;
};

function formatOwnerRole(
  role: PlatformAdminPayoutVerificationAccount["ownerRole"],
) {
  if (role === "landlord") {
    return "Landlord";
  }

  if (role === "agent") {
    return "Agent";
  }

  if (role === "manager") {
    return "Manager";
  }

  return "Developer";
}

function formatSubmittedAt(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return "Submission time unavailable";
  }

  return `Submitted ${new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(new Date(parsed))}`;
}

export function AdminPayoutVerificationPreview({
  accounts,
  total,
}: AdminPayoutVerificationPreviewProps) {
  const visibleAccounts = (accounts ?? []).slice(0, 3);

  return (
    <SectionCard
      title="Bank accounts to verify"
      description="Review these accounts before online payouts are enabled."
      action={
        <Link
          href="/admin/payout-verifications"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover"
        >
          View all {total > 0 ? `(${total})` : ""}
          <ArrowRight aria-hidden="true" size={16} strokeWidth={2.7} />
        </Link>
      }
      contentClassName="py-2 md:py-3"
    >
      {visibleAccounts.length === 0 ? (
        <div className="flex items-center gap-3 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
            <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.7} />
          </div>
          <div>
            <p className="text-sm font-black text-text-strong">
              All bank accounts are reviewed
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              New submissions will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border-soft">
          {visibleAccounts.map((account) => (
            <Link
              key={`${account.ownerRole}-${account.id}`}
              href="/admin/payout-verifications"
              className="group flex min-h-20 items-center gap-3 py-4 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning">
                <Landmark aria-hidden="true" size={19} strokeWidth={2.6} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-black text-text-strong sm:text-base">
                    {account.ownerName}
                  </h3>
                  <Badge tone="warning">
                    {formatOwnerRole(account.ownerRole)}
                  </Badge>
                </div>

                <p className="mt-1 truncate text-sm font-semibold text-text-muted">
                  {account.bankName} · {account.maskedAccountNumber}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {formatSubmittedAt(account.createdAt)}
                </p>
              </div>

              <span className="hidden shrink-0 items-center gap-1 text-sm font-extrabold text-primary sm:inline-flex">
                Review
                <ArrowRight
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                  size={16}
                  strokeWidth={2.7}
                />
              </span>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
