import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ManagerLandlordStatementSnapshot } from "@/server/repositories/manager-statement-documents.repository";

type ManagerRemittanceSummaryPdfProps = {
  documentNumber: string;
  snapshot: ManagerLandlordStatementSnapshot;
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
    paddingBottom: 16,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0F172A",
  },
  meta: {
    marginTop: 6,
    fontSize: 9,
    color: "#516070",
    lineHeight: 1.5,
  },
  titleBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#F4F7FB",
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0F172A",
  },
  summary: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#0B5FFF",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#DBEAFE",
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  grid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DDE5F2",
    backgroundColor: "#F8FAFC",
  },
  cardLabel: {
    fontSize: 8,
    color: "#64748B",
    textTransform: "uppercase",
  },
  cardValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 700,
    color: "#0F172A",
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E6ECF5",
    borderBottomWidth: 0,
  },
  lastRow: {
    borderBottomWidth: 1,
  },
  cell: {
    padding: 8,
    fontSize: 8,
    color: "#172033",
  },
  headerCell: {
    fontWeight: 700,
    backgroundColor: "#F8FAFC",
    color: "#475569",
  },
  empty: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#E6ECF5",
    borderRadius: 8,
    color: "#64748B",
    fontSize: 9,
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

function statusLabel(status: string) {
  if (status === "confirmed") return "Confirmed";
  if (status === "recorded") return "Recorded";
  if (status === "pending_confirmation") return "Pending";
  if (status === "rejected") return "Rejected";
  return "Reversed";
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

export function ManagerRemittanceSummaryPdf({
  documentNumber,
  snapshot,
}: ManagerRemittanceSummaryPdfProps) {
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
      title={`Remittance Summary ${documentNumber}`}
      author={snapshot.organization.name}
      subject="Remittance Summary"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{snapshot.organization.name}</Text>
          {organizationContact ? (
            <Text style={styles.meta}>{organizationContact}</Text>
          ) : null}

          <View style={styles.titleBox}>
            <Text style={styles.title}>Remittance Summary</Text>
            <Text style={styles.meta}>
              Landlord: {snapshot.landlord.name}
              {"\n"}
              Period: {periodLabel}
              {"\n"}
              Summary No: {documentNumber}
              {"\n"}
              Generated: {formatDate(snapshot.generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Amount remitted to landlord</Text>
          <Text style={styles.summaryValue}>
            {formatNaira(snapshot.totals.amountRemitted)}
          </Text>
        </View>

        <View style={styles.grid}>
          <SummaryCard
            label="Landlord amount"
            value={formatNaira(snapshot.totals.amountDueToLandlord)}
          />
          <SummaryCard
            label="Amount remitted"
            value={formatNaira(snapshot.totals.amountRemitted)}
          />
          <SummaryCard
            label="Balance due"
            value={formatNaira(snapshot.totals.pendingLandlordBalance)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remittance records</Text>

          {snapshot.remittances.length > 0 ? (
            <View>
              <View style={styles.row}>
                <Text
                  style={[styles.cell, styles.headerCell, { width: "24%" }]}
                >
                  Date
                </Text>
                <Text
                  style={[styles.cell, styles.headerCell, { width: "25%" }]}
                >
                  Amount
                </Text>
                <Text
                  style={[styles.cell, styles.headerCell, { width: "21%" }]}
                >
                  Status
                </Text>
                <Text
                  style={[styles.cell, styles.headerCell, { width: "30%" }]}
                >
                  Reference
                </Text>
              </View>

              {snapshot.remittances.map((remittance, index) => (
                <View
                  key={remittance.id}
                  style={[
                    styles.row,
                    index === snapshot.remittances.length - 1
                      ? styles.lastRow
                      : {},
                  ]}
                >
                  <Text style={[styles.cell, { width: "24%" }]}>
                    {formatDate(remittance.remittanceDate)}
                  </Text>
                  <Text style={[styles.cell, { width: "25%" }]}>
                    {formatNaira(remittance.amountRemitted)}
                  </Text>
                  <Text style={[styles.cell, { width: "21%" }]}>
                    {statusLabel(remittance.status)}
                  </Text>
                  <Text style={[styles.cell, { width: "30%" }]}>
                    {remittance.reference ?? "Not stated"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>
              No remittance record was found for this period.
            </Text>
          )}
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
