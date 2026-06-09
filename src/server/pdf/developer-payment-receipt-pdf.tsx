import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

export type DeveloperPaymentReceiptPdfData = {
  receiptNumber: string;
  developerLabel: string;
  buyerName: string;
  estateName: string;
  estateLocation: string;
  plotLabel: string;
  saleReference: string;
  paymentReference: string;
  amountPaid: string;
  platformFee: string;
  totalPaid: string;
  paymentDate: string;
  balanceBefore: string;
  balanceAfter: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1D4ED8",
    color: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 700,
    marginRight: 12,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },
  brandSubtitle: {
    marginTop: 3,
    fontSize: 9,
    color: "#6B7280",
  },
  titleBlock: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1D4ED8",
  },
  receiptNumber: {
    marginTop: 6,
    fontSize: 10,
    color: "#374151",
  },
  section: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 7,
  },
  rowLast: {
    flexDirection: "row",
    paddingVertical: 7,
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
  amountGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  amountBox: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  amountLabel: {
    fontSize: 8,
    color: "#6B7280",
    fontWeight: 700,
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: 700,
  },
  footer: {
    marginTop: 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    fontSize: 8,
    color: "#6B7280",
    lineHeight: 1.5,
  },
});

function ReceiptRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={isLast ? styles.rowLast : styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function DeveloperPaymentReceiptPdf({
  data,
}: {
  data: DeveloperPaymentReceiptPdfData;
}) {
  return (
    <Document
      author="Boldverse Property"
      creator="Boldverse Property"
      producer="Boldverse Property"
      title={`Developer Payment Receipt ${data.receiptNumber}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text>B</Text>
          </View>

          <View>
            <Text style={styles.brandTitle}>Boldverse Property</Text>
            <Text style={styles.brandSubtitle}>
              Developer sale payment receipt
            </Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Payment Receipt</Text>
          <Text style={styles.receiptNumber}>
            Receipt Number: {data.receiptNumber}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sale Details</Text>
          <ReceiptRow label="Developer" value={data.developerLabel} />
          <ReceiptRow label="Buyer" value={data.buyerName} />
          <ReceiptRow label="Estate" value={data.estateName} />
          <ReceiptRow label="Estate location" value={data.estateLocation} />
          <ReceiptRow label="Plot" value={data.plotLabel} />
          <ReceiptRow label="Sale reference" value={data.saleReference} />
          <ReceiptRow
            label="Payment reference"
            value={data.paymentReference}
            isLast
          />
        </View>

        <View style={styles.amountGrid}>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>AMOUNT PAID</Text>
            <Text style={styles.amountValue}>{data.amountPaid}</Text>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>PLATFORM FEE</Text>
            <Text style={styles.amountValue}>{data.platformFee}</Text>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>TOTAL PAID</Text>
            <Text style={styles.amountValue}>{data.totalPaid}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ledger Balance</Text>
          <ReceiptRow label="Payment date" value={data.paymentDate} />
          <ReceiptRow label="Balance before" value={data.balanceBefore} />
          <ReceiptRow label="Balance after" value={data.balanceAfter} isLast />
        </View>

        <Text style={styles.footer}>
          This receipt confirms a verified payment processed through Boldverse
          Property for the developer sale referenced above. Final title document
          access remains subject to full payment and developer document release
          rules.
        </Text>
      </Page>
    </Document>
  );
}

async function normalisePdfOutputToBuffer(
  output: Buffer | NodeJS.ReadableStream,
) {
  if (Buffer.isBuffer(output)) {
    return output;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of output as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function renderDeveloperPaymentReceiptPdfBuffer(
  data: DeveloperPaymentReceiptPdfData,
) {
  const output = await pdf(
    <DeveloperPaymentReceiptPdf data={data} />,
  ).toBuffer();

  return normalisePdfOutputToBuffer(output);
}
