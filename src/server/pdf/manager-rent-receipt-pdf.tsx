import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ManagerRentReceiptSnapshot } from "@/server/repositories/manager-receipts.repository";

type ManagerRentReceiptPdfProps = {
  receiptNumber: string;
  generatedAt: string;
  snapshot: ManagerRentReceiptSnapshot;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: "#172033",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#DDE5F2",
    paddingBottom: 18,
    marginBottom: 18,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0F172A",
  },
  companyMeta: {
    marginTop: 6,
    fontSize: 9,
    color: "#516070",
    lineHeight: 1.5,
  },
  titleRow: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "#F4F7FB",
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0F172A",
  },
  titleMeta: {
    marginTop: 6,
    fontSize: 9,
    color: "#516070",
    lineHeight: 1.5,
  },
  statusPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: "#EAF2FF",
  },
  statusText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#155EEF",
    textTransform: "uppercase",
  },
  section: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#DDE5F2",
    borderRadius: 10,
    overflow: "hidden",
  },
  sectionTitle: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E6ECF5",
  },
  cellLabel: {
    width: "34%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 9,
    color: "#64748B",
    backgroundColor: "#FBFCFE",
  },
  cellValue: {
    width: "66%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 9,
    color: "#172033",
    fontWeight: 600,
  },
  amountBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#0B5FFF",
  },
  amountLabel: {
    fontSize: 9,
    color: "#DBEAFE",
  },
  amountValue: {
    marginTop: 5,
    fontSize: 22,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  balanceText: {
    marginTop: 7,
    fontSize: 9,
    color: "#EAF2FF",
  },
  note: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    color: "#92400E",
    fontSize: 9,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 26,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#DDE5F2",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#64748B",
  },
});

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not stated";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPaymentStatusLabel(
  status: ManagerRentReceiptSnapshot["payment"]["status"],
) {
  if (status === "verified") {
    return "Verified online payment";
  }

  if (status === "recorded") {
    return "Recorded manual payment";
  }

  if (status === "pending_confirmation") {
    return "Awaiting confirmation";
  }

  if (status === "rejected") {
    return "Rejected payment";
  }

  return "Reversed payment";
}

function getPaymentReceiverLabel(value: string) {
  if (value === "bopa_verified") {
    return "BOPA verified collection";
  }

  if (value === "manager") {
    return "Property manager";
  }

  if (value === "landlord") {
    return "Landlord";
  }

  return value || "Not stated";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value}</Text>
    </View>
  );
}

export function ManagerRentReceiptPdf({
  receiptNumber,
  generatedAt,
  snapshot,
}: ManagerRentReceiptPdfProps) {
  const organizationContact = [
    snapshot.organization.phone,
    snapshot.organization.email,
  ]
    .filter(Boolean)
    .join(" | ");

  const propertyLine = snapshot.property.address
    ? `${snapshot.property.name} - ${snapshot.property.address}`
    : snapshot.property.name;

  const paymentStatusLabel = getPaymentStatusLabel(snapshot.payment.status);

  return (
    <Document
      title={`Rent Receipt ${receiptNumber}`}
      author={snapshot.organization.name}
      subject="Rent Receipt"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{snapshot.organization.name}</Text>
          {organizationContact ? (
            <Text style={styles.companyMeta}>{organizationContact}</Text>
          ) : null}

          <View style={styles.titleRow}>
            <Text style={styles.title}>Rent Receipt</Text>
            <Text style={styles.titleMeta}>
              Receipt No: {receiptNumber}
              {"\n"}
              Generated: {formatDateTime(generatedAt)}
            </Text>

            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{paymentStatusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total paid</Text>
          <Text style={styles.amountValue}>
            {formatNaira(snapshot.payment.totalPaid)}
          </Text>
          <Text style={styles.balanceText}>
            Tenant balance after this record:{" "}
            {formatNaira(snapshot.tenant.balanceAfterPayment)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tenant and rent details</Text>
          <Row label="Tenant" value={snapshot.tenant.name} />
          <Row
            label="Tenant phone"
            value={snapshot.tenant.phone ?? "Not stated"}
          />
          <Row label="Property" value={propertyLine} />
          <Row label="Unit" value={snapshot.unit.label} />
          <Row label="Landlord" value={snapshot.landlord.name} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment details</Text>
          <Row
            label="Payment date"
            value={formatDate(snapshot.payment.paymentDate)}
          />
          <Row
            label="Rent period"
            value={`${formatDate(snapshot.payment.periodStart)} to ${formatDate(
              snapshot.payment.periodEnd,
            )}`}
          />
          <Row label="Payment method" value={snapshot.payment.paymentMethod} />
          <Row
            label="Payment reference"
            value={snapshot.payment.paymentReference ?? "Not stated"}
          />
          <Row
            label="Payment receiver"
            value={getPaymentReceiverLabel(snapshot.payment.paymentReceiver)}
          />
          <Row label="Payment status" value={paymentStatusLabel} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount breakdown</Text>
          <Row
            label="Rent"
            value={formatNaira(
              snapshot.payment.baseRentAmount > 0
                ? snapshot.payment.baseRentAmount
                : snapshot.payment.amountPaid,
            )}
          />
          {snapshot.payment.serviceChargeItems.map((item) => (
            <Row
              key={`${item.chargeId}-${item.name}`}
              label={item.name}
              value={formatNaira(item.amount)}
            />
          ))}
          {snapshot.payment.serviceChargeAmount > 0 ? (
            <Row
              label="Service-charge total"
              value={formatNaira(snapshot.payment.serviceChargeAmount)}
            />
          ) : null}
          <Row
            label="BOPA fee"
            value={formatNaira(snapshot.payment.bopaPlatformFee)}
          />
          <Row
            label="Paystack charge"
            value={formatNaira(snapshot.payment.paystackChargeAmount)}
          />
          <Row
            label="Other charges"
            value={formatNaira(snapshot.payment.otherChargesAmount)}
          />
          <Row label="Total paid" value={formatNaira(snapshot.payment.totalPaid)} />
        </View>

        {snapshot.payment.status === "recorded" ? (
          <Text style={styles.note}>
            This receipt is based on a manual payment record saved by the
            property manager.
          </Text>
        ) : null}

        {snapshot.payment.status === "verified" ? (
          <Text style={styles.note}>
            This payment has been confirmed online and the rent record has been
            updated.
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by BOPA - Boldverse Property App
          </Text>
          <Text style={styles.footerText}>{receiptNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
