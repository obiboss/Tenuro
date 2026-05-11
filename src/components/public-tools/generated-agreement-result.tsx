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
  return (
    <div className="rounded-card border border-border-soft bg-white p-5 shadow-card md:p-6">
      <div className="border-b border-border-soft pb-4">
        <p className="text-sm font-bold text-primary">
          Agreement preview generated
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
          {agreement.title}
        </h2>
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
        This is a generated agreement preview. PDF download, account saving, and
        tenant acceptance will be added in the next agreement batches.
      </div>

      <p className="mt-5 border-t border-border-soft pt-4 text-xs font-semibold text-text-muted">
        {agreement.watermarkText}
      </p>
    </div>
  );
}
