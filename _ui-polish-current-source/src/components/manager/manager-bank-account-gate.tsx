"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ManagerBankAccountGateProps = {
  verificationStatus?: string | null;
};

function getGateCopy(status: string | null | undefined) {
  if (!status) {
    return {
      badge: "Bank account required",
      title: "Add bank account to receive rent",
      description:
        "Add and verify the manager bank account before creating tenant payment links.",
      button: "Add bank account",
      href: "/manager/settings#payout-account",
      tone: "warning" as const,
    };
  }

  if (status === "verified") {
    return null;
  }

  if (status === "unverified" || status === "pending") {
    return {
      badge: "Verification pending",
      title: "Bank account verification pending",
      description:
        "Your bank account has been submitted. Paystack verification may take up to 24 hours. Tenant payment links will work after verification is completed.",
      button: "View bank account",
      href: "/manager/settings#payout-account",
      tone: "primary" as const,
    };
  }

  return {
    badge: "Bank account needs attention",
    title: "Update bank account details",
    description:
      "Your payout account is not verified yet. Update the bank details before creating tenant payment links.",
    button: "Update bank account",
    href: "/manager/settings#payout-account",
    tone: "danger" as const,
  };
}

export function ManagerBankAccountGate({
  verificationStatus,
}: ManagerBankAccountGateProps) {
  const [isOpen, setIsOpen] = useState(true);
  const copy = getGateCopy(verificationStatus);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!copy || !isOpen) {
    return null;
  }

  const badgeClassName =
    copy.tone === "danger"
      ? "bg-danger-soft text-danger"
      : copy.tone === "primary"
        ? "bg-primary-soft text-primary"
        : "bg-warning-soft text-warning";

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-bank-account-gate-title"
        className="relative w-full max-w-lg rounded-card border border-border-soft bg-white p-5 shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close bank account notice"
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-surface text-xl font-black leading-none text-text-muted transition hover:bg-border-soft hover:text-text-strong"
        >
          ×
        </button>

        <p
          className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${badgeClassName}`}
        >
          {copy.badge}
        </p>

        <h2
          id="manager-bank-account-gate-title"
          className="mt-4 pr-10 text-xl font-black tracking-tight text-text-strong"
        >
          {copy.title}
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          {copy.description}
        </p>

        <div className="mt-5 rounded-card border border-border-soft bg-surface p-4">
          <p className="text-sm font-black text-text-strong">
            What is blocked for now
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            You can continue viewing records, but adding a new tenant that
            requires Paystack payment should stay disabled until the payout
            account is verified.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-surface"
          >
            Not now
          </button>

          <Link
            href={copy.href}
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            {copy.button}
          </Link>
        </div>
      </section>
    </div>
  );
}
