import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type ManagerTenantDetailsSnapshot = {
  generatedAt: string;
  organization: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  landlord: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  property: {
    name: string;
    address: string;
  };
  unit: {
    label: string;
    type: string | null;
  };
  tenant: {
    name: string;
    phone: string;
    email: string | null;
    occupation: string | null;
    moveInDate: string | null;
    nextRentDueDate: string | null;
    rentAmount: number;
    currentBalance: number;
    status: string;
    notes: string | null;
  };
  payments: Array<{
    id: string;
    date: string;
    amount: number;
    periodStart: string | null;
    periodEnd: string | null;
    reference: string | null;
    status: string;
  }>;
  totals: {
    confirmedOrRecorded: number;
    awaitingConfirmation: number;
  };
};

type Props = {
  snapshot: ManagerTenantDetailsSnapshot;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 34,
    paddingBottom: 48,
    fontSize: 10,
    color: "#172033",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#DDE5F2",
    paddingBottom: 16,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0F172A",
  },
  muted: {
    marginTop: 5,
    color: "#64748B",
    lineHeight: 1.45,
  },
  titleBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#F4F7FB",
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: "#0F172A",
  },
  titleMeta: {
    marginTop: 6,
    color: "#516070",
    lineHeight: 1.5,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 11,
    borderRadius: 9,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E6ECF5",
  },
  summaryLabel: {
    fontSize: 7.5,
    color: "#64748B",
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: 700,
    color: "#0F172A",
  },
  section: {
    marginTop: 17,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "#0F172A",
  },
  detailBox: {
    borderWidth: 1,
    borderColor: "#DDE5F2",
    borderRadius: 9,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  detailLabel: {
    width: "36%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: "#64748B",
    backgroundColor: "#FBFCFE",
  },
  detailValue: {
    width: "64%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#DDE5F2",
    borderRadius: 9,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F4F7FB",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E6ECF5",
  },
  cell: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 8.8,
    lineHeight: 1.35,
  },
  tableHeading: {
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
  },
  empty: {
    padding: 13,
    color: "#64748B",
    textAlign: "center",
  },
  note: {
    marginTop: 16,
    padding: 12,
    borderRadius: 9,
    backgroundColor: "#EEF4FF",
    color: "#344054",
    lineHeight: 1.55,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 22,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#DDE5F2",
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748B",
    fontSize: 7.5,
  },
});

function formatMoney(amount: number) {
  const value = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

  return `NGN ${value}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  const date =
    value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(date);
}

function tenantStatusLabel(status: string) {
  if (status === "active") return "Current tenant";
  if (status === "eviction_notice") return "Notice served";
  if (status === "moved_out") return "Moved out";
  return "Inactive";
}

function paymentStatusLabel(status: string) {
  if (status === "verified") return "Verified";
  if (status === "recorded") return "Recorded";
  if (status === "pending_confirmation") return "Awaiting confirmation";
  if (status === "reversed") return "Reversed";
  return "Rejected";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow} wrap={false}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function TenantFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>Powered by BOPA - Boldverse Property App</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

export function ManagerTenantDetailsPdf({ snapshot }: Props) {
  const organizationContact = [
    snapshot.organization.phone,
    snapshot.organization.email,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <Document
      title={`Tenant details - ${snapshot.tenant.name}`}
      author={snapshot.organization.name}
      subject="Tenant details and rent position"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{snapshot.organization.name}</Text>
          {organizationContact ? (
            <Text style={styles.muted}>{organizationContact}</Text>
          ) : null}

          <View style={styles.titleBox}>
            <Text style={styles.title}>Tenant details</Text>
            <Text style={styles.titleMeta}>
              Prepared for {snapshot.landlord.name}
              {"\n"}
              {snapshot.property.name} · {snapshot.unit.label}
              {"\n"}
              Generated {formatDate(snapshot.generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Current rent</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(snapshot.tenant.rentAmount)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Rent received</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(snapshot.totals.confirmedOrRecorded)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Amount owing</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(snapshot.tenant.currentBalance)}
            </Text>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Tenant information</Text>
          <View style={styles.detailBox}>
            <DetailRow label="Full name" value={snapshot.tenant.name} />
            <DetailRow label="Phone number" value={snapshot.tenant.phone} />
            <DetailRow
              label="Email address"
              value={snapshot.tenant.email ?? "Not provided"}
            />
            <DetailRow
              label="Occupation"
              value={snapshot.tenant.occupation ?? "Not provided"}
            />
            <DetailRow
              label="Current status"
              value={tenantStatusLabel(snapshot.tenant.status)}
            />
          </View>
        </View>

        <TenantFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Property and rent information</Text>
          <View style={styles.detailBox}>
            <DetailRow label="Property" value={snapshot.property.name} />
            <DetailRow label="Address" value={snapshot.property.address} />
            <DetailRow
              label="Apartment or unit"
              value={`${snapshot.unit.label}${
                snapshot.unit.type ? ` · ${snapshot.unit.type}` : ""
              }`}
            />
            <DetailRow
              label="Tenancy started"
              value={formatDate(snapshot.tenant.moveInDate)}
            />
            <DetailRow
              label="Next rent due"
              value={formatDate(snapshot.tenant.nextRentDueDate)}
            />
            <DetailRow
              label="Current rent"
              value={formatMoney(snapshot.tenant.rentAmount)}
            />
            <DetailRow
              label="Current amount owing"
              value={formatMoney(snapshot.tenant.currentBalance)}
            />
          </View>
        </View>

        <TenantFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent rent payments</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text
                style={[styles.cell, styles.tableHeading, { width: "15%" }]}
              >
                Date
              </Text>
              <Text
                style={[styles.cell, styles.tableHeading, { width: "18%" }]}
              >
                Amount
              </Text>
              <Text
                style={[styles.cell, styles.tableHeading, { width: "27%" }]}
              >
                Rent period
              </Text>
              <Text
                style={[styles.cell, styles.tableHeading, { width: "18%" }]}
              >
                Reference
              </Text>
              <Text
                style={[styles.cell, styles.tableHeading, { width: "22%" }]}
              >
                Status
              </Text>
            </View>

            {snapshot.payments.length > 0 ? (
              snapshot.payments.slice(0, 12).map((payment) => (
                <View key={payment.id} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.cell, { width: "15%" }]}>
                    {formatDate(payment.date)}
                  </Text>
                  <Text style={[styles.cell, { width: "18%" }]}>
                    {formatMoney(payment.amount)}
                  </Text>
                  <Text style={[styles.cell, { width: "27%" }]}>
                    {payment.periodStart || payment.periodEnd
                      ? `${formatDate(payment.periodStart)} - ${formatDate(payment.periodEnd)}`
                      : "Not stated"}
                  </Text>
                  <Text style={[styles.cell, { width: "18%" }]}>
                    {payment.reference ?? "Not stated"}
                  </Text>
                  <Text style={[styles.cell, { width: "22%" }]}>
                    {paymentStatusLabel(payment.status)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                No rent payment has been recorded.
              </Text>
            )}
          </View>
        </View>

        {snapshot.totals.awaitingConfirmation > 0 ? (
          <Text style={styles.note}>
            {formatMoney(snapshot.totals.awaitingConfirmation)} is still
            awaiting confirmation and is not included in the rent received
            total.
          </Text>
        ) : null}

        {snapshot.tenant.notes ? (
          <Text style={styles.note}>
            Manager’s note: {snapshot.tenant.notes}
          </Text>
        ) : null}

        <TenantFooter />
      </Page>
    </Document>
  );
}
