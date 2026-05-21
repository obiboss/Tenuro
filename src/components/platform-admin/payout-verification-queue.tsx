import { CreditCard, ShieldCheck } from "lucide-react";
import { PayoutVerificationActions } from "@/components/platform-admin/payout-verification-actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/cn";
import type {
  PlatformAdminPayoutVerificationAccount,
  PlatformAdminPayoutVerificationQueue,
} from "@/server/services/platform-admin-payout-verification.service";
import type { PaystackVerificationStatus } from "@/server/types/paystack.types";

type PayoutVerificationQueueProps = {
  queue: PlatformAdminPayoutVerificationQueue;
};

type QueueSectionProps = {
  title: string;
  description: string;
  accounts: PlatformAdminPayoutVerificationAccount[];
  emptyTitle: string;
  emptyDescription: string;
  highlightPending?: boolean;
};

const statusCopy: Record<
  PaystackVerificationStatus,
  {
    label: string;
    tone: "success" | "warning" | "danger";
  }
> = {
  unverified: {
    label: "Pending Verification",
    tone: "warning",
  },
  verified: {
    label: "Verified",
    tone: "success",
  },
  failed: {
    label: "Verification Failed",
    tone: "danger",
  },
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not verified";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOwnerRole(
  role: PlatformAdminPayoutVerificationAccount["ownerRole"],
) {
  return role === "landlord" ? "Landlord" : "Agent";
}

function StatusBadge({ status }: { status: PaystackVerificationStatus }) {
  const copy = statusCopy[status];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}

function AccountDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold wrap-break-word text-text-strong">
        {value || "Not available"}
      </p>
    </div>
  );
}

function AccountCard({
  account,
  highlightPending,
}: {
  account: PlatformAdminPayoutVerificationAccount;
  highlightPending?: boolean;
}) {
  const showActions =
    account.isActive &&
    (account.verificationStatus === "unverified" ||
      account.verificationStatus === "failed");

  return (
    <article
      className={cn(
        "rounded-card border border-border-soft bg-background p-4",
        highlightPending && "border-warning/35 bg-warning-soft/30",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          showActions && "xl:flex-row xl:items-start xl:justify-between",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-text-strong">
                  {account.ownerName}
                </h3>
                <Badge tone="primary">
                  {formatOwnerRole(account.ownerRole)}
                </Badge>
                <StatusBadge status={account.verificationStatus} />
              </div>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                {account.ownerEmail ??
                  account.ownerPhoneNumber ??
                  account.ownerId}
              </p>
            </div>

            <div className="text-sm font-bold text-text-muted md:text-right">
              <p>Created {formatDateTime(account.createdAt)}</p>
              <p className="mt-1">
                Verified {formatDateTime(account.verifiedAt)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AccountDetail label="Bank" value={account.bankName} />
            <AccountDetail label="Account Name" value={account.accountName} />
            <AccountDetail
              label="Account Number"
              value={account.maskedAccountNumber}
            />
            <AccountDetail
              label="Subaccount"
              value={account.paystackSubaccountCode}
            />
          </div>
        </div>

        {showActions ? (
          <div className="w-full xl:w-64">
            <PayoutVerificationActions
              accountType={account.ownerRole}
              accountId={account.id}
              expectedUpdatedAt={account.updatedAt}
              verificationStatus={account.verificationStatus}
              isActive={account.isActive}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function QueueSection({
  title,
  description,
  accounts,
  emptyTitle,
  emptyDescription,
  highlightPending,
}: QueueSectionProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      action={
        <Badge tone={accounts.length > 0 ? "primary" : "neutral"}>
          {accounts.length}
        </Badge>
      }
      contentClassName="space-y-4"
    >
      {accounts.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={<ShieldCheck aria-hidden="true" size={24} strokeWidth={2.6} />}
          className="bg-background shadow-none"
        />
      ) : (
        accounts.map((account) => (
          <AccountCard
            key={`${account.ownerRole}-${account.id}`}
            account={account}
            highlightPending={highlightPending}
          />
        ))
      )}
    </SectionCard>
  );
}

export function PayoutVerificationQueue({
  queue,
}: PayoutVerificationQueueProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-card bg-warning-soft p-5 text-warning shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
              <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold">Pending Verification</p>
              <p className="mt-1 text-2xl font-black">{queue.totals.pending}</p>
              <p className="mt-1 text-sm leading-6 text-text-normal">
                Active payout accounts waiting for review.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-success-soft p-5 text-success shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
              <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold">Verified</p>
              <p className="mt-1 text-2xl font-black">
                {queue.totals.verified}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-normal">
                Accounts currently marked safe for split payouts.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-danger-soft p-5 text-danger shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
              <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold">Verification Failed</p>
              <p className="mt-1 text-2xl font-black">{queue.totals.failed}</p>
              <p className="mt-1 text-sm leading-6 text-text-normal">
                Accounts blocked until corrected and reviewed again.
              </p>
            </div>
          </div>
        </div>
      </div>

      <QueueSection
        title="Pending payout accounts"
        description="Review active landlord and agent payout accounts before split settlements are enabled."
        accounts={queue.pending}
        emptyTitle="No pending payout accounts"
        emptyDescription="New landlord and agent payout accounts will appear here for platform review."
        highlightPending
      />

      <QueueSection
        title="Verified payout accounts"
        description="Accounts approved for Paystack split settlement flows."
        accounts={queue.verified}
        emptyTitle="No verified payout accounts"
        emptyDescription="Verified payout accounts will appear here after admin approval."
      />

      <QueueSection
        title="Failed payout accounts"
        description="Accounts that failed platform review and cannot receive split settlements."
        accounts={queue.failed}
        emptyTitle="No failed payout accounts"
        emptyDescription="Failed payout accounts will appear here if review cannot approve them."
      />
    </div>
  );
}
