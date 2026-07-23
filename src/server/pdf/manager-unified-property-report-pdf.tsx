import type { ComponentProps, ReactElement } from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ManagerUnifiedPropertyReportSnapshot } from "@/lib/manager-unified-report";

type ManagerUnifiedPropertyReportPdfProps = {
  snapshot: ManagerUnifiedPropertyReportSnapshot;
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
  brand: {
    fontSize: 19,
    fontWeight: 700,
    color: "#0F172A",
  },
  muted: {
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
  summaryGrid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 7,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E6ECF5",
    backgroundColor: "#F8FAFC",
  },
  label: {
    fontSize: 7,
    color: "#64748B",
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: 700,
    color: "#0F172A",
  },
  section: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: 7,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F7",
    paddingVertical: 6,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingVertical: 6,
    gap: 6,
    backgroundColor: "#F8FAFC",
  },
  cell: {
    flexGrow: 1,
    flexBasis: 0,
  },
  cellWide: {
    flexGrow: 1.5,
    flexBasis: 0,
  },
  headerText: {
    fontSize: 7,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
  },
  normalText: {
    fontSize: 8,
    color: "#334155",
  },
  strongText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#0F172A",
  },
  warning: {
    marginTop: 12,
    padding: 9,
    borderRadius: 8,
    backgroundColor: "#FFF7E8",
    color: "#8A5A00",
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#DDE5F2",
    fontSize: 7,
    color: "#64748B",
  },
});

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);

  return Number.isNaN(parsed.getTime())
    ? "Not set"
    : new Intl.DateTimeFormat("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(parsed);
}

function paymentMethod(value: string) {
  return value.replaceAll("_", " ");
}

export function ManagerUnifiedPropertyReportPdf({
  snapshot,
}: ManagerUnifiedPropertyReportPdfProps): ReactElement<
  ComponentProps<typeof Document>
> {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{snapshot.organization.name}</Text>
          <Text style={styles.muted}>
            BOPA Manager property record
            {snapshot.organization.phone ? ` · ${snapshot.organization.phone}` : ""}
            {snapshot.organization.email ? ` · ${snapshot.organization.email}` : ""}
          </Text>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Landlord property report</Text>
            <Text style={styles.muted}>
              Landlord: {snapshot.landlord.landlord_name}
            </Text>
            <Text style={styles.muted}>
              Property: {snapshot.property.property_name} · {snapshot.property.property_address}
            </Text>
            <Text style={styles.muted}>
              Period: {date(snapshot.period.dateFrom)} to {date(snapshot.period.dateTo)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Rent collected</Text>
            <Text style={styles.value}>{money(snapshot.totals.rentCollected)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Manager commission</Text>
            <Text style={styles.value}>{money(snapshot.totals.managerCommission)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Maintenance & expenses</Text>
            <Text style={styles.value}>
              {money(snapshot.totals.maintenanceAndExpenses)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Amount remitted</Text>
            <Text style={styles.value}>{money(snapshot.totals.amountRemitted)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Pending landlord balance</Text>
            <Text style={styles.value}>
              {money(snapshot.totals.pendingLandlordBalance)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Occupancy and rent position</Text>
          <Text style={styles.muted}>
            {snapshot.occupancy.occupiedUnits} of {snapshot.occupancy.totalUnits} units occupied · {snapshot.occupancy.occupancyRate}% occupancy · {snapshot.occupancy.tenantsOwing} owing · {snapshot.occupancy.tenantsDueSoon} due soon
          </Text>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.headerText]}>Unit</Text>
            <Text style={[styles.cellWide, styles.headerText]}>Tenant</Text>
            <Text style={[styles.cell, styles.headerText]}>Status</Text>
            <Text style={[styles.cell, styles.headerText]}>Next due</Text>
            <Text style={[styles.cell, styles.headerText]}>Balance</Text>
          </View>
          {snapshot.rentPositions.length > 0 ? (
            snapshot.rentPositions.map((position) => (
              <View key={position.tenantId} style={styles.row}>
                <Text style={[styles.cell, styles.strongText]}>{position.unitLabel}</Text>
                <Text style={[styles.cellWide, styles.normalText]}>{position.tenantName}</Text>
                <Text style={[styles.cell, styles.normalText]}>{position.statusLabel}</Text>
                <Text style={[styles.cell, styles.normalText]}>{date(position.nextDueDate)}</Text>
                <Text style={[styles.cell, styles.strongText]}>{money(position.balance)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No current tenant record for this property.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rent payment records</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.cellWide, styles.headerText]}>Tenant / unit</Text>
            <Text style={[styles.cell, styles.headerText]}>Date</Text>
            <Text style={[styles.cell, styles.headerText]}>Amount</Text>
            <Text style={[styles.cell, styles.headerText]}>Commission</Text>
            <Text style={[styles.cell, styles.headerText]}>Source</Text>
          </View>
          {snapshot.payments.length > 0 ? (
            snapshot.payments.map((payment) => (
              <View key={payment.id} style={styles.row}>
                <Text style={[styles.cellWide, styles.normalText]}>
                  {payment.tenantName} · {payment.unitLabel}
                </Text>
                <Text style={[styles.cell, styles.normalText]}>{date(payment.paymentDate)}</Text>
                <Text style={[styles.cell, styles.strongText]}>{money(payment.amountPaid)}</Text>
                <Text style={[styles.cell, styles.normalText]}>{money(payment.managerCommission)}</Text>
                <Text style={[styles.cell, styles.normalText]}>{payment.source}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No rent payment was recorded in this period.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maintenance and other property expenses</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.cellWide, styles.headerText]}>Expense</Text>
            <Text style={[styles.cell, styles.headerText]}>Date</Text>
            <Text style={[styles.cell, styles.headerText]}>Vendor</Text>
            <Text style={[styles.cell, styles.headerText]}>Status</Text>
            <Text style={[styles.cell, styles.headerText]}>Amount</Text>
          </View>
          {snapshot.expenses.length > 0 ? (
            snapshot.expenses.map((expense) => (
              <View key={expense.id} style={styles.row}>
                <Text style={[styles.cellWide, styles.normalText]}>{expense.title}</Text>
                <Text style={[styles.cell, styles.normalText]}>{date(expense.date)}</Text>
                <Text style={[styles.cell, styles.normalText]}>{expense.vendorName ?? "Not added"}</Text>
                <Text style={[styles.cell, styles.normalText]}>{expense.status.replaceAll("_", " ")}</Text>
                <Text style={[styles.cell, styles.strongText]}>{money(expense.amount)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No maintenance or expense was recorded in this period.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property remittances</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.headerText]}>Date</Text>
            <Text style={[styles.cell, styles.headerText]}>Amount</Text>
            <Text style={[styles.cell, styles.headerText]}>Method</Text>
            <Text style={[styles.cellWide, styles.headerText]}>Reference</Text>
          </View>
          {snapshot.remittances.length > 0 ? (
            snapshot.remittances.map((remittance) => (
              <View key={remittance.id} style={styles.row}>
                <Text style={[styles.cell, styles.normalText]}>{date(remittance.remittanceDate)}</Text>
                <Text style={[styles.cell, styles.strongText]}>{money(remittance.amountRemitted)}</Text>
                <Text style={[styles.cell, styles.normalText]}>{paymentMethod(remittance.paymentMethod)}</Text>
                <Text style={[styles.cellWide, styles.normalText]}>{remittance.paymentReference ?? "No reference"}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No property-specific remittance was recorded in this period.</Text>
          )}
        </View>

        {snapshot.totals.unallocatedLandlordRemittances > 0 ? (
          <Text style={styles.warning}>
            {money(snapshot.totals.unallocatedLandlordRemittances)} in older landlord remittances for this period is not assigned to a specific property and has not been added to this property’s remitted total.
          </Text>
        ) : null}

        <Text style={styles.footer}>
          Generated from BOPA Manager records. This report reflects information recorded for the selected property and period.
        </Text>
      </Page>
    </Document>
  );
}
