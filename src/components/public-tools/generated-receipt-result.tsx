"use client";

type GeneratedReceiptResultProps = {
  receipt: {
    receiptNumber: string;
    landlordFullName: string;
    tenantFullName: string;
    propertyLabel: string;
    rentAmount: number;
    paymentDate: string;
    rentPeriodStart: string;
    rentPeriodEnd: string;
    paymentMethod: string;
    whatsappMessage: string;
    watermarkText: string;
    downloadUrl: string;
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

export function GeneratedReceiptResult({
  receipt,
}: GeneratedReceiptResultProps) {
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    receipt.whatsappMessage,
  )}`;

  return (
    <div className="rounded-card border border-border-soft bg-white p-5 shadow-card md:p-6">
      <div className="flex flex-col gap-3 border-b border-border-soft pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">Receipt generated</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
            {receipt.receiptNumber}
          </h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={receipt.downloadUrl}
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
          >
            Download PDF
          </a>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-success px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:opacity-90"
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
            {receipt.landlordFullName}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Tenant
          </p>
          <p className="mt-1 font-black text-text-strong">
            {receipt.tenantFullName}
          </p>
        </div>

        <div className="rounded-button bg-background p-4 md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Property
          </p>
          <p className="mt-1 font-black text-text-strong">
            {receipt.propertyLabel}
          </p>
        </div>

        <div className="rounded-button bg-primary-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Amount Paid
          </p>
          <p className="mt-1 text-2xl font-black text-text-strong">
            {formatMoney(receipt.rentAmount)}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Method
          </p>
          <p className="mt-1 font-black text-text-strong">
            {receipt.paymentMethod}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Payment Date
          </p>
          <p className="mt-1 font-black text-text-strong">
            {formatDate(receipt.paymentDate)}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Rent Period
          </p>
          <p className="mt-1 font-black text-text-strong">
            {formatDate(receipt.rentPeriodStart)} -{" "}
            {formatDate(receipt.rentPeriodEnd)}
          </p>
        </div>
      </div>

      <p className="mt-5 border-t border-border-soft pt-4 text-xs font-semibold text-text-muted">
        {receipt.watermarkText}
      </p>
    </div>
  );
}
