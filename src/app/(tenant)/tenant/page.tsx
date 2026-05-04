import { CalendarDays, FileText, Home, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentTenantDashboard } from "@/server/services/tenant-dashboard.service";
import { formatNaira } from "@/server/utils/money";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function paymentMethodLabel(method: string) {
  if (method === "paystack_gateway") {
    return "Paystack";
  }

  if (method === "bank_transfer") {
    return "Bank Transfer";
  }

  if (method === "cash") {
    return "Cash";
  }

  return "Other";
}

export default async function TenantDashboardPage() {
  const dashboard = await getCurrentTenantDashboard();

  const property = dashboard.tenant.units?.properties;
  const unit = dashboard.tenant.units;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${dashboard.tenant.full_name}`}
        description="View your apartment, agreement, rent balance, payment history, and receipts."
        action={<Badge tone="success">Tenant</Badge>}
      />

      <div id="rent" className="grid scroll-mt-28 gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Home aria-hidden="true" size={21} strokeWidth={2.6} />
              </div>

              <div>
                <p className="text-sm font-bold text-text-muted">Apartment</p>
                <p className="mt-1 font-extrabold text-text-strong">
                  {unit?.unit_identifier ?? "Not assigned"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <CalendarDays aria-hidden="true" size={21} strokeWidth={2.6} />
              </div>

              <div>
                <p className="text-sm font-bold text-text-muted">Rent Due</p>
                <p className="mt-1 font-extrabold text-text-strong">
                  {formatNaira(dashboard.outstandingBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <ReceiptText aria-hidden="true" size={21} strokeWidth={2.6} />
              </div>

              <div>
                <p className="text-sm font-bold text-text-muted">Payments</p>
                <p className="mt-1 font-extrabold text-text-strong">
                  {dashboard.payments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div id="profile" className="scroll-mt-28">
            <SectionCard
              title="My Apartment"
              description="Your current assigned property and unit."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Property</p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {property?.property_name ?? "Not available"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    {property?.address ?? "Address not available"}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Unit</p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {unit?.unit_identifier ?? "Not available"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    {unit?.unit_type ?? "Unit type not available"}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          <div id="payments" className="scroll-mt-28">
            <SectionCard
              title="Payment History"
              description="Your recorded rent payments and available receipts."
            >
              {dashboard.payments.length === 0 ? (
                <EmptyState
                  title="No payments yet"
                  description="Your rent payment history will appear here after payment is recorded."
                  icon={
                    <ReceiptText
                      aria-hidden="true"
                      size={24}
                      strokeWidth={2.6}
                    />
                  }
                />
              ) : (
                <div className="space-y-3">
                  {dashboard.payments.map((payment) => (
                    <Card key={payment.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle>
                              {formatNaira(Number(payment.amount_paid))}
                            </CardTitle>
                            <p className="mt-1 text-sm leading-6 text-text-muted">
                              {paymentMethodLabel(payment.payment_method)} ·{" "}
                              {formatDate(payment.payment_date)}
                            </p>
                          </div>

                          <Badge
                            tone={
                              payment.status === "posted" ? "success" : "danger"
                            }
                          >
                            {payment.status === "posted"
                              ? "Posted"
                              : "Reversed"}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="rounded-button bg-background p-4">
                          <p className="text-sm font-bold text-text-muted">
                            Receipt
                          </p>

                          <p className="mt-1 text-sm leading-6 text-text-muted">
                            {payment.receipt_number ?? "Receipt not generated"}
                          </p>

                          {payment.receiptDownloadUrl ? (
                            <a
                              href={payment.receiptDownloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
                            >
                              Download Receipt
                            </a>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div id="agreement" className="scroll-mt-28">
            <SectionCard
              title="Agreement"
              description="Your accepted tenancy agreement."
            >
              {dashboard.agreement ? (
                <div className="space-y-4">
                  <TrustNotice
                    title="Agreement accepted"
                    description={`Accepted on ${formatDate(
                      dashboard.agreement.tenant_accepted_at,
                    )}.`}
                    icon={
                      <FileText
                        aria-hidden="true"
                        size={22}
                        strokeWidth={2.6}
                      />
                    }
                  />

                  {dashboard.agreementDownloadUrl ? (
                    <a
                      href={dashboard.agreementDownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
                    >
                      Download Agreement
                    </a>
                  ) : null}
                </div>
              ) : (
                <TrustNotice
                  title="Agreement not available"
                  description="Your accepted agreement will appear here when available."
                  icon={
                    <FileText aria-hidden="true" size={22} strokeWidth={2.6} />
                  }
                />
              )}
            </SectionCard>
          </div>

          {dashboard.tenancy ? (
            <SectionCard
              title="Tenancy Period"
              description="Current active tenancy dates."
            >
              <div className="space-y-3">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Start</p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {formatDate(dashboard.tenancy.start_date)}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">End</p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {formatDate(dashboard.tenancy.end_date)}
                  </p>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
