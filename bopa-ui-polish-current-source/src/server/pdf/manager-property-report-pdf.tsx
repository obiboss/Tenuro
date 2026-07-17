import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ManagerPropertyReportSnapshot } from "@/server/repositories/manager-statement-documents.repository";

type Props = {
  documentNumber: string;
  snapshot: ManagerPropertyReportSnapshot;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 30,
    paddingBottom: 42,
    fontSize: 8.5,
    color: "#172033",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#DDE5F2",
    paddingBottom: 12,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 19,
    fontWeight: 700,
    color: "#0F172A",
  },
  companyMeta: {
    marginTop: 4,
    color: "#64748B",
    lineHeight: 1.4,
  },
  titleBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F4F7FB",
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
  },
  titleMeta: {
    marginTop: 5,
    color: "#516070",
    lineHeight: 1.4,
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
  summaryRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E6ECF5",
  },
  summaryLabel: {
    fontSize: 6.8,
    color: "#64748B",
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: 700,
    color: "#0F172A",
  },
  detailGrid: {
    flexDirection: "row",
    gap: 10,
  },
  detailColumn: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 7,
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: 3,
    fontWeight: 700,
    lineHeight: 1.4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 7,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#EEF3F8",
    borderBottomWidth: 1,
    borderBottomColor: "#DDE5F2",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 5,
    lineHeight: 1.35,
  },
  headerText: {
    fontSize: 6.7,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
  },
  empty: {
    padding: 12,
    color: "#64748B",
    textAlign: "center",
  },
  note: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFF7E6",
    color: "#6B4F12",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    left: 30,
    right: 30,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748B",
    fontSize: 7,
  },
});

function formatMoney(amount: number) {
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
    timeZone: "Africa/Lagos",
  }).format(
    value.length === 10
      ? new Date(`${value}T00:00:00Z`)
      : new Date(value),
  );
}

function formatPeriod(dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom && !dateTo) {
    return "All available records";
  }

  return `${formatDate(dateFrom)} to ${formatDate(dateTo)}`;
}

function paymentStatusLabel(value: string) {
  if (value === "verified") {
    return "Verified";
  }

  if (value === "recorded") {
    return "Recorded";
  }

  if (value === "pending_confirmation") {
    return "Pending";
  }

  if (value === "reversed") {
    return "Reversed";
  }

  return "Rejected";
}

function tenantPositionLabel(value: string) {
  if (value === "owing") {
    return "Owing";
  }

  if (value === "due_soon") {
    return "Due soon";
  }

  if (value === "paid_up") {
    return "Paid up";
  }

  return "Not current";
}

function maintenanceStatusLabel(value: string) {
  if (value === "in_progress") {
    return "In progress";
  }

  if (value === "resolved") {
    return "Resolved";
  }

  if (value === "cancelled") {
    return "Cancelled";
  }

  return "Reported";
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Powered by BOPA — Boldverse Property App</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

export function ManagerPropertyReportPdf({
  documentNumber,
  snapshot,
}: Props) {
  const location = [
    snapshot.property.address,
    snapshot.property.lga,
    snapshot.property.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Document
      title={`Property report - ${snapshot.property.name}`}
      author={snapshot.organization.name}
      subject="BOPA Manager property report"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>
            {snapshot.organization.name}
          </Text>
          <Text style={styles.companyMeta}>
            {snapshot.organization.phone ?? "Phone not provided"}
            {"  •  "}
            {snapshot.organization.email ?? "Email not provided"}
          </Text>

          <View style={styles.titleBox}>
            <Text style={styles.title}>Property report</Text>
            <Text style={styles.titleMeta}>
              {snapshot.property.name}
              {"\n"}
              {location}
              {"\n"}
              Report number: {documentNumber}
              {"  •  "}
              Period: {formatPeriod(snapshot.dateFrom, snapshot.dateTo)}
              {"  •  "}
              Generated: {formatDate(snapshot.generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Landlord</Text>
            <Text style={styles.detailValue}>
              {snapshot.landlord.name}
            </Text>
            <Text style={styles.companyMeta}>
              {snapshot.landlord.phone ?? "Phone not provided"}
              {"\n"}
              {snapshot.landlord.email ?? "Email not provided"}
            </Text>
          </View>

          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Property position</Text>
            <Text style={styles.detailValue}>
              {snapshot.occupancy.occupiedUnits} occupied ·{" "}
              {snapshot.occupancy.vacantUnits} vacant ·{" "}
              {snapshot.occupancy.reservedUnits} reserved
            </Text>
            <Text style={styles.companyMeta}>
              {snapshot.tenantPosition.currentTenants} current tenants ·{" "}
              {snapshot.tenantPosition.owingTenants} owing
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total received</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(snapshot.totals.totalReceived)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Landlord share</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(snapshot.totals.landlordShare)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Manager fee</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(snapshot.totals.managerCommission)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding rent</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(
                snapshot.tenantPosition.outstandingBalance,
              )}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Service charges</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(snapshot.totals.serviceChargesReceived)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Open maintenance</Text>
            <Text style={styles.summaryValue}>
              {snapshot.totals.openMaintenanceCount}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current tenant position</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "26%" },
                ]}
              >
                Tenant
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "14%" },
                ]}
              >
                Unit
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "17%" },
                ]}
              >
                Rent
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "18%" },
                ]}
              >
                Balance
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "25%" },
                ]}
              >
                Position
              </Text>
            </View>

            {snapshot.tenants.length > 0 ? (
              snapshot.tenants.map((tenant) => (
                <View
                  key={tenant.id}
                  style={styles.tableRow}
                  wrap={false}
                >
                  <Text style={[styles.cell, { width: "26%" }]}>
                    {tenant.fullName}
                  </Text>
                  <Text style={[styles.cell, { width: "14%" }]}>
                    {tenant.unitLabel}
                  </Text>
                  <Text style={[styles.cell, { width: "17%" }]}>
                    {formatMoney(tenant.rentAmount)}
                  </Text>
                  <Text style={[styles.cell, { width: "18%" }]}>
                    {formatMoney(tenant.currentBalance)}
                  </Text>
                  <Text style={[styles.cell, { width: "25%" }]}>
                    {tenantPositionLabel(tenant.rentPosition)}
                    {tenant.nextRentDueDate
                      ? ` · ${formatDate(tenant.nextRentDueDate)}`
                      : ""}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                No current tenant record for this property.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rent activity</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "19%" },
                ]}
              >
                Date
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "23%" },
                ]}
              >
                Tenant
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "12%" },
                ]}
              >
                Unit
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "18%" },
                ]}
              >
                Amount
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "14%" },
                ]}
              >
                Share
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "14%" },
                ]}
              >
                Status
              </Text>
            </View>

            {snapshot.payments.length > 0 ? (
              snapshot.payments.map((payment) => (
                <View
                  key={payment.id}
                  style={styles.tableRow}
                  wrap={false}
                >
                  <Text style={[styles.cell, { width: "19%" }]}>
                    {formatDate(payment.paymentDate)}
                  </Text>
                  <Text style={[styles.cell, { width: "23%" }]}>
                    {payment.tenantName}
                  </Text>
                  <Text style={[styles.cell, { width: "12%" }]}>
                    {payment.unitLabel}
                  </Text>
                  <Text style={[styles.cell, { width: "18%" }]}>
                    {formatMoney(payment.amountPaid)}
                  </Text>
                  <Text style={[styles.cell, { width: "14%" }]}>
                    {formatMoney(payment.landlordShare)}
                  </Text>
                  <Text style={[styles.cell, { width: "14%" }]}>
                    {paymentStatusLabel(payment.status)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                No rent activity for the selected period.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maintenance activity</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "18%" },
                ]}
              >
                Date
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "35%" },
                ]}
              >
                Issue
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "12%" },
                ]}
              >
                Unit
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "17%" },
                ]}
              >
                Expected
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.headerText,
                  { width: "18%" },
                ]}
              >
                Status
              </Text>
            </View>

            {snapshot.maintenance.length > 0 ? (
              snapshot.maintenance.map((item) => (
                <View
                  key={item.id}
                  style={styles.tableRow}
                  wrap={false}
                >
                  <Text style={[styles.cell, { width: "18%" }]}>
                    {formatDate(item.reportedDate)}
                  </Text>
                  <Text style={[styles.cell, { width: "35%" }]}>
                    {item.issueTitle}
                  </Text>
                  <Text style={[styles.cell, { width: "12%" }]}>
                    {item.unitLabel ?? "Property"}
                  </Text>
                  <Text style={[styles.cell, { width: "17%" }]}>
                    {formatMoney(item.estimatedCost)}
                  </Text>
                  <Text style={[styles.cell, { width: "18%" }]}>
                    {maintenanceStatusLabel(item.status)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                No maintenance activity for the selected period.
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.note}>
          This property report includes rent, occupancy, tenant position, and
          maintenance records saved in BOPA. Landlord remittances are
          landlord-wide records and remain in the landlord statement unless
          they are specifically allocated to a property.
        </Text>

        <Footer />
      </Page>
    </Document>
  );
}
