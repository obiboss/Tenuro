"use client";

import { useState } from "react";
import { downloadPublicDocumentPdf } from "@/lib/public-document-download";
import { buildWaMeUrl } from "@/lib/whatsapp";

type GeneratedAgreementResultProps = {
  agreement: {
    title: string;
    landlordFullName: string;
    tenantFullName: string;
    tenantPhoneNumber: string;
    propertyLabel: string;
    rentAmount: number;
    rentFrequency: string;
    tenancyStartDate: string;
    tenancyEndDate: string;
    agreementBody: string;
    watermarkText: string;
    downloadUrl: string;
    whatsappMessage: string;
    agreementId: string;
    remainingAgreements: number;
    agreementTier: "free" | "paid";
  };
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function GeneratedAgreementResult({
  agreement,
}: GeneratedAgreementResultProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const whatsappHref = buildWaMeUrl({
    phoneNumber: agreement.tenantPhoneNumber,
    message: agreement.whatsappMessage,
  });
  const isPro = agreement.agreementTier === "paid";

  return (
    <div className="overflow-hidden rounded-card border border-border-soft bg-[#f4f1e9] shadow-card">
      <div className="flex flex-col gap-4 border-b border-border-soft bg-white p-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.location.assign(window.location.pathname)}
            className="inline-flex min-h-11 items-center justify-center rounded-button border-2 border-primary px-4 text-sm font-extrabold text-primary hover:bg-primary-soft"
          >
            ← Back to form
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-text-strong">Preview</h2>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-white">
                {isPro ? "Tenancy Agreement Pro" : "Free agreement"}
              </span>
            </div>
            <p className="text-sm text-text-muted">
              Check the details before downloading or sharing.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          <a
            href={agreement.downloadUrl}
            aria-disabled={isDownloading}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              if (isDownloading) return;
              setIsDownloading(true);
              void downloadPublicDocumentPdf({
                url: agreement.downloadUrl,
                fallbackFilename: "tenancy-agreement.pdf",
                event: "TenancyAgreementDownload",
              }).finally(() => setIsDownloading(false));
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-center text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
          >
            {isDownloading ? "Preparing PDF…" : "Download PDF"}
          </a>

          <a
            href={whatsappHref}
            onClick={() => {
              const downloadUrl = new URL(
                agreement.downloadUrl,
                window.location.origin,
              );
              void fetch(
                `/api/public-tools/agreement/${agreement.agreementId}/activity`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token: downloadUrl.searchParams.get("token"),
                    action: "whatsapp_shared",
                  }),
                  keepalive: true,
                },
              );
            }}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-success px-5 py-2.5 text-center text-sm font-extrabold text-white shadow-soft transition hover:opacity-90"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      <div className="p-4 md:p-7">
        <article className="mx-auto max-w-3xl rounded-md border border-border-soft bg-white px-6 py-8 shadow-card md:px-12 md:py-10">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm text-text-muted">Prepared by</p>
              <p className="font-black text-text-strong">
                {agreement.landlordFullName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Agreement type</p>
              <p className="font-black text-primary">
                {isPro ? "Pro" : "Free preview"}
              </p>
            </div>
          </div>

          <h1 className="mt-8 border-b border-border-soft pb-5 text-center font-serif text-2xl font-black tracking-wide text-text-strong md:text-3xl">
            TENANCY AGREEMENT
          </h1>

          <div className="space-y-5 py-6 font-serif text-[15px] leading-7 text-text-strong">
            <p>
              <strong>LANDLORD:</strong> {agreement.landlordFullName}
            </p>
            <p>
              <strong>TENANT:</strong> {agreement.tenantFullName}
            </p>
            <hr className="border-border-soft" />
            <p>
              <strong>1. PREMISES.</strong> The Landlord lets to the Tenant the
              premises known as {agreement.propertyLabel}.
            </p>
            <p>
              <strong>2. TERM.</strong> The tenancy starts on{" "}
              {formatDate(agreement.tenancyStartDate)} and ends on{" "}
              {formatDate(agreement.tenancyEndDate)}.
            </p>
            <p>
              <strong>3. RENT.</strong> The Tenant shall pay rent of{" "}
              {formatMoney(agreement.rentAmount)} per {agreement.rentFrequency}.
            </p>
            <details className="rounded-button bg-background p-4 font-sans text-sm">
              <summary className="cursor-pointer font-extrabold text-primary">
                Read the full agreement wording
              </summary>
              <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-6 text-text-muted">
                {agreement.agreementBody}
              </pre>
            </details>
          </div>

          <div className="mt-5">
            <p className="font-serif font-black text-text-strong">SIGNED</p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div className="border-t border-text-strong pt-2 text-sm font-bold">
                Landlord / Agent
              </div>
              <div className="border-t border-text-strong pt-2 text-sm font-bold">
                Tenant
              </div>
            </div>
          </div>

          {!isPro ? (
            <p className="mt-8 text-xs font-semibold text-text-muted">
              {agreement.watermarkText}
            </p>
          ) : null}
        </article>

        <p className="mx-auto mt-4 max-w-3xl text-sm font-bold text-primary">
          {agreement.remainingAgreements} agreement
          {agreement.remainingAgreements === 1 ? "" : "s"} remaining
        </p>
      </div>
    </div>
  );
}
