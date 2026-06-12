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
  developerName: string;
  buyerName: string;
  estateName: string;
  estateLocation: string;
  plotLabel: string;
  saleReference: string;
  paymentReference: string;
  amountPaid: string;
  bopaProcessingFee: string;
  totalPaid: string;
  paymentDate: string;
  outstandingBalanceAfterPayment: string;
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
  valueBox: {
    width: "62%",
  },
  valueText: {
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
  moneyInline: {
    flexDirection: "row",
    alignItems: "center",
  },
  moneyText: {
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

function stripCurrencyPrefix(value: string) {
  return value.replace(/^\s*(₦|NGN|N|¦)\s*/i, "").trim();
}

function NairaSymbol({
  size = 12,
  color = "#111827",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <View
      style={{
        width: size * 0.75,
        height: size * 1.05,
        marginRight: 3,
        position: "relative",
      }}
    >
      <Text
        style={{
          fontSize: size,
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        N
      </Text>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 1,
          top: size * 0.38,
          borderTopWidth: 1,
          borderTopColor: color,
        }}
      />

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 1,
          top: size * 0.54,
          borderTopWidth: 1,
          borderTopColor: color,
        }}
      />
    </View>
  );
}

function MoneyText({ value, size = 12 }: { value: string; size?: number }) {
  return (
    <View style={styles.moneyInline}>
      <NairaSymbol size={size} />
      <Text style={[styles.moneyText, { fontSize: size }]}>
        {stripCurrencyPrefix(value)}
      </Text>
    </View>
  );
}

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
      <View style={styles.valueBox}>
        <Text style={styles.valueText}>{value}</Text>
      </View>
    </View>
  );
}

function ReceiptMoneyRow({
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
      <View style={styles.valueBox}>
        <MoneyText value={value} size={10} />
      </View>
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
      author={data.developerName}
      creator="BOPA"
      producer="BOPA"
      title={`Payment Receipt ${data.receiptNumber}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text>B</Text>
          </View>

          <View>
            <Text style={styles.brandTitle}>{data.developerName}</Text>
            <Text style={styles.brandSubtitle}>Powered by BOPA app</Text>
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
          <ReceiptRow label="Developer" value={data.developerName} />
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
            <MoneyText value={data.amountPaid} size={12} />
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>BOPA PROCESSING FEE</Text>
            <MoneyText value={data.bopaProcessingFee} size={12} />
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>TOTAL PAID</Text>
            <MoneyText value={data.totalPaid} size={12} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Record</Text>
          <ReceiptRow label="Payment date" value={data.paymentDate} />
          <ReceiptMoneyRow
            label="Outstanding balance after this payment"
            value={data.outstandingBalanceAfterPayment}
            isLast
          />
        </View>

        <Text style={styles.footer}>
          This receipt confirms a verified payment processed through BOPA app
          for the developer sale referenced above. BOPA provides payment records
          and buyer portal access. Final title document access remains subject
          to full payment and the developer&apos;s document release rules.
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
// ```

// ---

// ## What changes after this

// ```txt id="uqx28t"
// Developer account UUID ❌
// Developer company name ✅

// Platform Fee ❌
// BOPA Processing Fee ✅

// Broken Naira symbol ¦ ❌
// Drawn Naira symbol ₦ style ✅

// Balance before / Balance after ❌
// Outstanding balance after this payment ✅
// ```

// ## Important for old receipts

// Already generated PDFs will not change until regenerated.

// For the old receipt, run this SQL first:

// ```sql id="z7gn1a"
// update public.developer_sale_payments
// set
//   receipt_generated = false,
//   receipt_number = null,
//   receipt_path = null
// where payment_reference = 'BPD-A1D8B49C8A5A4FF7A2';
// ```

// Then run your repair route again for that reference.

// After that, download the receipt again. It should show the developer company name, BOPA processing fee, corrected Naira display, and only the useful outstanding balance.
