import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ManagerLandlordStatementSnapshot } from "@/server/repositories/manager-statement-documents.repository";

type ManagerLandlordStatementPdfProps = {
  documentNumber: string;
  snapshot: ManagerLandlordStatementSnapshot;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    color: "#172033",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#DDE5F2",
    paddingBottom: 14,
    marginBottom: 14,
  },
  companyName: {
    fontSize: 19,
    fontWeight: 700,
    color: "#0F172A",
  },
  companyMeta: {
    marginTop: 5,
    fontSize: 8,
    color: "#516070",
    lineHeight: 1.4,
  },
  titleBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#F4F7FB",
    borderRadius: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
  },
  titleMeta: {
    marginTop: 5,
    fontSize: 8,
    color: "#516070",
    lineHeight: 1.4,
  },
  summaryGrid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 9,
    borderRadius: 9,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E6ECF5",
  },
  summaryLabel: {
    fontSize: 7,
    color: "#64748B",
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: 700,
    color: "#0F172A",
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: 7,
  },
  table: {
    borderWidth: 1,
    borderColor: "#DDE5F2",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#DDE5F2",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E6ECF5",
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 7,
    color: "#172033",
  },
  headerCell: {
    fontWeight: 700,
    color: "#475569",
  },
  empty: {
    padding: 10,
    fontSize: 8,
    color: "#64748B",
  },
  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 22,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#DDE5F2",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
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

function statusLabel(status: string) {
  if (status === "verified") return "Verified";
  if (status === "recorded") return "Recorded";
  if (status === "pending_confirmation") return "Pending";
  if (status === "confirmed") return "Confirmed";
  if (status === "rejected") return "Rejected";
  return "Reversed";
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export function ManagerLandlordStatementPdf({
  documentNumber,
  snapshot,
}: ManagerLandlordStatementPdfProps) {
  const organizationContact = [
    snapshot.organization.phone,
    snapshot.organization.email,
  ]
    .filter(Boolean)
    .join(" | ");

  const periodLabel = `${formatDate(snapshot.dateFrom)} to ${formatDate(
    snapshot.dateTo,
  )}`;

  return (
    <Document
      title={`Landlord Statement ${documentNumber}`}
      author={snapshot.organization.name}
      subject="Landlord Statement"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{snapshot.organization.name}</Text>
          {organizationContact ? (
            <Text style={styles.companyMeta}>{organizationContact}</Text>
          ) : null}

          <View style={styles.titleBox}>
            <Text style={styles.title}>Landlord Statement</Text>
            <Text style={styles.titleMeta}>
              Landlord: {snapshot.landlord.name}
              {"\n"}
              Period: {periodLabel}
              {"\n"}
              Statement No: {documentNumber}
              {"\n"}
              Generated: {formatDate(snapshot.generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Rent recorded"
            value={formatNaira(snapshot.totals.totalRentRecorded)}
          />
          <SummaryCard
            label="Manager fee"
            value={formatNaira(snapshot.totals.managerCommission)}
          />
          <SummaryCard
            label="Landlord amount"
            value={formatNaira(snapshot.totals.amountDueToLandlord)}
          />
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Amount remitted"
            value={formatNaira(snapshot.totals.amountRemitted)}
          />
          <SummaryCard
            label="Balance due"
            value={formatNaira(snapshot.totals.pendingLandlordBalance)}
          />
          <SummaryCard
            label="Awaiting confirmation"
            value={formatNaira(snapshot.totals.pendingConfirmationAmount)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rent payments</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.headerCell, { width: "15%" }]}>
                Date
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: "25%" }]}>
                Tenant
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: "17%" }]}>
                Paid
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: "17%" }]}>
                Manager fee
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: "17%" }]}>
                Landlord
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: "9%" }]}>
                Status
              </Text>
            </View>

            {snapshot.payments.length > 0 ? (
              snapshot.payments.map((payment) => (
                <View key={payment.id} style={styles.tableRow}>
                  <Text style={[styles.cell, { width: "15%" }]}>
                    {formatDate(payment.paymentDate)}
                  </Text>
                  <Text style={[styles.cell, { width: "25%" }]}>
                    {payment.tenantName}
                    {"\n"}
                    {payment.propertyName} - {payment.unitLabel}
                  </Text>
                  <Text style={[styles.cell, { width: "17%" }]}>
                    {formatNaira(payment.amountPaid)}
                  </Text>
                  <Text style={[styles.cell, { width: "17%" }]}>
                    {formatNaira(payment.managerCommission)}
                  </Text>
                  <Text style={[styles.cell, { width: "17%" }]}>
                    {formatNaira(payment.landlordShare)}
                  </Text>
                  <Text style={[styles.cell, { width: "9%" }]}>
                    {statusLabel(payment.status)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                No rent payment found for this period.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remittances</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.headerCell, { width: "22%" }]}>
                Date
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: "25%" }]}>
                Amount
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: "23%" }]}>
                Status
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: "30%" }]}>
                Reference
              </Text>
            </View>

            {snapshot.remittances.length > 0 ? (
              snapshot.remittances.map((remittance) => (
                <View key={remittance.id} style={styles.tableRow}>
                  <Text style={[styles.cell, { width: "22%" }]}>
                    {formatDate(remittance.remittanceDate)}
                  </Text>
                  <Text style={[styles.cell, { width: "25%" }]}>
                    {formatNaira(remittance.amountRemitted)}
                  </Text>
                  <Text style={[styles.cell, { width: "23%" }]}>
                    {statusLabel(remittance.status)}
                  </Text>
                  <Text style={[styles.cell, { width: "30%" }]}>
                    {remittance.reference ?? "Not stated"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                No remittance found for this period.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by BOPA - Boldverse Property App
          </Text>
          <Text style={styles.footerText}>{documentNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
