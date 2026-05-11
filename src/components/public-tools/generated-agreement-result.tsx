"use client";

type GeneratedAgreementResultProps = {
  agreement: {
    title: string;
    landlordFullName: string;
    tenantFullName: string;
    propertyLabel: string;
    rentAmount: number;
    rentFrequency: string;
    tenancyStartDate: string;
    tenancyEndDate: string;
    agreementBody: string;
    watermarkText: string;
    downloadUrl: string;
    whatsappMessage: string;
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
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    agreement.whatsappMessage,
  )}`;

  return (
    <div className="rounded-card border border-border-soft bg-white p-5 shadow-card md:p-6">
      <div className="flex flex-col gap-3 border-b border-border-soft pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">
            Agreement preview generated
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
            {agreement.title}
          </h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          <a
            href={agreement.downloadUrl}
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-center text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
          >
            Download PDF
          </a>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-success px-5 py-2.5 text-center text-sm font-extrabold text-white shadow-soft transition hover:opacity-90"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Landlord
          </p>
          <p className="mt-1 font-black text-text-strong">
            {agreement.landlordFullName}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Tenant
          </p>
          <p className="mt-1 font-black text-text-strong">
            {agreement.tenantFullName}
          </p>
        </div>

        <div className="rounded-button bg-background p-4 md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Premises
          </p>
          <p className="mt-1 font-black text-text-strong">
            {agreement.propertyLabel}
          </p>
        </div>

        <div className="rounded-button bg-primary-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Rent
          </p>
          <p className="mt-1 text-2xl font-black text-text-strong">
            {formatMoney(agreement.rentAmount)}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Rent Frequency
          </p>
          <p className="mt-1 font-black text-text-strong">
            Per {agreement.rentFrequency}
          </p>
        </div>

        <div className="rounded-button bg-background p-4 md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Tenancy Period
          </p>
          <p className="mt-1 font-black text-text-strong">
            {formatDate(agreement.tenancyStartDate)} -{" "}
            {formatDate(agreement.tenancyEndDate)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-button bg-background p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
          Agreement Body Preview
        </p>

        <pre className="mt-3 max-h-105 overflow-auto whitespace-pre-wrap rounded-button bg-white p-4 text-xs leading-6 text-text-muted">
          {agreement.agreementBody}
        </pre>
      </div>

      <div className="mt-5 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
        This is a watermarked public agreement preview. Account saving, editing,
        and pro storage will be added in the next agreement batch.
      </div>

      <p className="mt-5 border-t border-border-soft pt-4 text-xs font-semibold text-text-muted">
        {agreement.watermarkText}
      </p>
    </div>
  );
}
