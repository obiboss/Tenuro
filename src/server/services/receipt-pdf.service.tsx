import "server-only";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { RentPaymentRow } from "@/server/repositories/payments.repository";
import type { PublicGeneratedReceiptRow } from "@/server/repositories/public-tool-leads.repository";

export type RentReceiptPaymentBreakdown = {
  rentAmount: number;
  bopaServiceFeeAmount: number;
  totalPaidAmount: number;
  feePercentage: number | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    borderBottomStyle: "solid",
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1D4ED8",
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
  },
  meta: {
    marginTop: 6,
    fontSize: 8,
    color: "#6B7280",
  },
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
    paddingVertical: 8,
  },
  label: {
    width: "38%",
    color: "#6B7280",
    fontWeight: 700,
  },
  value: {
    width: "62%",
    color: "#111827",
    fontWeight: 700,
  },
  amountBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
  },
  amountLabel: {
    fontSize: 9,
    color: "#1D4ED8",
    fontWeight: 700,
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 20,
    color: "#111827",
    fontWeight: 700,
  },
  breakdownBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
    paddingVertical: 7,
  },
  breakdownLabel: {
    color: "#6B7280",
    fontWeight: 700,
  },
  breakdownValue: {
    color: "#111827",
    fontWeight: 700,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 9,
  },
  totalLabel: {
    color: "#111827",
    fontWeight: 700,
    fontSize: 11,
  },
  totalValue: {
    color: "#111827",
    fontWeight: 700,
    fontSize: 11,
  },
  note: {
    marginTop: 8,
    fontSize: 8,
    color: "#6B7280",
  },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderTopStyle: "solid",
    fontSize: 8,
    color: "#6B7280",
  },
});

function formatPdfMoney(amount: number) {
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `NGN ${formatted}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatFeePercentage(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return `${value.toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}%`;
}

function paymentMethodLabel(method: RentPaymentRow["payment_method"]) {
  if (method === "bank_transfer") {
    return "Bank Transfer";
  }

  if (method === "cash") {
    return "Cash";
  }

  if (method === "paystack_gateway") {
    return "Paystack";
  }

  return "Other";
}

function publicPaymentMethodLabel(
  method: PublicGeneratedReceiptRow["payment_method"],
) {
  if (method === "bank_transfer") {
    return "Bank Transfer";
  }

  if (method === "cash") {
    return "Cash";
  }

  if (method === "paystack_gateway") {
    return "Paystack";
  }

  return "Other";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

function ReceiptPaymentBreakdown({
  payment,
  breakdown,
}: {
  payment: RentPaymentRow;
  breakdown: RentReceiptPaymentBreakdown;
}) {
  const feePercentage = formatFeePercentage(breakdown.feePercentage);
  const hasBopaServiceFee = breakdown.bopaServiceFeeAmount > 0;

  return (
    <View style={styles.breakdownBox}>
      <BreakdownRow
        label="Rent credited to ledger"
        value={formatPdfMoney(breakdown.rentAmount)}
      />

      {hasBopaServiceFee ? (
        <BreakdownRow
          label={
            feePercentage
              ? `BOPA service fee (${feePercentage})`
              : "BOPA service fee"
          }
          value={formatPdfMoney(breakdown.bopaServiceFeeAmount)}
        />
      ) : null}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          {payment.payment_method === "paystack_gateway"
            ? "Total paid via Paystack"
            : "Total paid"}
        </Text>
        <Text style={styles.totalValue}>
          {formatPdfMoney(breakdown.totalPaidAmount)}
        </Text>
      </View>

      {hasBopaServiceFee ? (
        <Text style={styles.note}>
          The rent amount above is what was credited to the tenancy ledger. The
          BOPA service fee is recorded separately and does not reduce or inflate
          the rent balance.
        </Text>
      ) : null}
    </View>
  );
}

function ReceiptPdfDocument({
  payment,
  breakdown,
}: {
  payment: RentPaymentRow;
  breakdown: RentReceiptPaymentBreakdown;
}) {
  const propertyName =
    payment.tenancies?.units?.properties?.property_name ?? "Property";
  const unitIdentifier = payment.tenancies?.units?.unit_identifier ?? "Unit";
  const tenantName = payment.tenants?.full_name ?? "Tenant";

  return (
    <Document
      title="Rent Receipt"
      author="Boldverse Property"
      subject="Rent Receipt"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Boldverse Property</Text>
          <Text style={styles.title}>Rent Receipt</Text>
          <Text style={styles.meta}>
            Receipt No: {payment.receipt_number ?? "Pending"} | Payment ID:{" "}
            {payment.id}
          </Text>
        </View>

        <View style={styles.section}>
          <Row label="Tenant" value={tenantName} />
          <Row label="Property" value={propertyName} />
          <Row label="Unit" value={unitIdentifier} />
          <Row
            label="Tenancy Reference"
            value={payment.tenancies?.tenancy_reference ?? "Not provided"}
          />
          <Row
            label="Payment Method"
            value={paymentMethodLabel(payment.payment_method)}
          />
          <Row
            label="Payment Reference"
            value={payment.payment_reference ?? "Not provided"}
          />
          <Row label="Payment Date" value={formatDate(payment.payment_date)} />
          <Row
            label="Payment Period"
            value={`${formatDate(payment.payment_for_period_start)} - ${formatDate(
              payment.payment_for_period_end,
            )}`}
          />
          <Row
            label="Balance Before"
            value={formatPdfMoney(Number(payment.balance_before))}
          />
          <Row
            label="Balance After"
            value={formatPdfMoney(Number(payment.balance_after))}
          />
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Rent Amount Recorded</Text>
          <Text style={styles.amountValue}>
            {formatPdfMoney(Number(payment.amount_paid))}
          </Text>
        </View>

        <ReceiptPaymentBreakdown payment={payment} breakdown={breakdown} />

        <Text style={styles.footer}>
          This is an electronically generated receipt from Boldverse Property, a
          product of Boldverse Services. This receipt confirms that the rent
          amount above was recorded in the landlord rent ledger.
        </Text>
      </Page>
    </Document>
  );
}

function PublicReceiptPdfDocument({
  receipt,
}: {
  receipt: PublicGeneratedReceiptRow;
}) {
  const propertyLabel = [
    receipt.property_name,
    receipt.unit_identifier,
    receipt.property_address,
    receipt.city_state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Document
      title="Rent Receipt"
      author="Boldverse Property"
      subject="Public Rent Receipt"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Boldverse Property</Text>
          <Text style={styles.title}>Rent Receipt</Text>
          <Text style={styles.meta}>
            Receipt No: {receipt.receipt_number} | Generated:{" "}
            {formatDate(receipt.created_at)}
          </Text>
        </View>

        <View style={styles.section}>
          <Row label="Landlord" value={receipt.landlord_full_name} />
          <Row label="Landlord Phone" value={receipt.landlord_phone_number} />
          <Row label="Tenant" value={receipt.tenant_full_name} />
          <Row label="Tenant Phone" value={receipt.tenant_phone_number} />
          <Row label="Property" value={propertyLabel} />
          <Row
            label="Payment Method"
            value={publicPaymentMethodLabel(receipt.payment_method)}
          />
          <Row label="Payment Date" value={formatDate(receipt.payment_date)} />
          <Row
            label="Payment Period"
            value={`${formatDate(receipt.rent_period_start)} - ${formatDate(
              receipt.rent_period_end,
            )}`}
          />
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>
            {formatPdfMoney(Number(receipt.rent_amount))}
          </Text>
        </View>

        <Text style={styles.footer}>
          Generated with BOPA — boldverseproperty.com
        </Text>
      </Page>
    </Document>
  );
}

export async function renderRentReceiptPdf(
  payment: RentPaymentRow,
  breakdown?: RentReceiptPaymentBreakdown,
) {
  const paymentBreakdown: RentReceiptPaymentBreakdown =
    breakdown ?? {
      rentAmount: Number(payment.amount_paid),
      bopaServiceFeeAmount: 0,
      totalPaidAmount: Number(payment.amount_paid),
      feePercentage: null,
    };

  return renderToBuffer(
    <ReceiptPdfDocument payment={payment} breakdown={paymentBreakdown} />,
  );
}

export async function renderPublicGeneratedReceiptPdf(
  receipt: PublicGeneratedReceiptRow,
) {
  return renderToBuffer(<PublicReceiptPdfDocument receipt={receipt} />);
}