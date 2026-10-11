import "server-only";

import {
  Circle,
  Document,
  G,
  Image,
  Line,
  Page,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
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
  publicPage: {
    paddingHorizontal: 42,
    paddingVertical: 38,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#14213D",
    lineHeight: 1.45,
  },
  publicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
  },
  publicPropertyName: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  publicTitle: { fontSize: 28, fontWeight: 700 },
  publicMetaBlock: { width: "36%", textAlign: "right", color: "#596174" },
  publicMetaValue: { color: "#14213D", fontSize: 11, fontWeight: 700 },
  publicAmountBox: { marginTop: 22, padding: 21, borderRadius: 12 },
  publicAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  publicAmountLabel: { fontSize: 9, fontWeight: 700, marginBottom: 7 },
  publicAmountValue: {
    fontSize: 31,
    fontWeight: 700,
    color: "#14213D",
    lineHeight: 1.05,
  },
  publicAmountWords: { marginTop: 11, fontSize: 11, color: "#495166" },
  publicPeopleRow: { flexDirection: "row", gap: 14, marginTop: 20 },
  publicPersonCard: {
    width: "50%",
    padding: 16,
    borderWidth: 1,
    borderColor: "#DEDAD0",
    borderStyle: "solid",
    borderRadius: 10,
  },
  publicPersonLabel: { color: "#596174", fontSize: 9, fontWeight: 700 },
  publicPersonName: { marginTop: 4, fontSize: 14, fontWeight: 700 },
  publicPersonPhone: { marginTop: 2, fontSize: 10, color: "#596174" },
  publicDetails: { marginTop: 22 },
  publicDetailRow: {
    flexDirection: "row",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#DEDAD0",
    borderBottomStyle: "solid",
  },
  publicDetailLabel: { width: "28%", color: "#596174" },
  publicDetailValue: { width: "72%", fontWeight: 700 },
  publicSignatures: {
    position: "relative",
    marginTop: 42,
    minHeight: 92,
    justifyContent: "flex-end",
  },
  publicSignatureBox: {
    width: "100%",
    minHeight: 60,
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#14213D",
    borderBottomStyle: "solid",
    paddingBottom: 4,
  },
  publicSignatureImage: {
    width: 170,
    height: 52,
    objectFit: "contain",
    objectPosition: "left bottom",
    marginLeft: 8,
  },
  publicSignatureText: {
    fontFamily: "Times-Italic",
    fontSize: 19,
    color: "#1E327A",
    marginLeft: 10,
    marginBottom: 1,
  },
  publicSignatureLabel: { marginTop: 5, color: "#596174" },
  publicStampImage: { width: 90, height: 90, objectFit: "contain" },
  publicFooter: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 28,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#DEDAD0",
    borderTopStyle: "solid",
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#667085",
    fontSize: 8,
  },
});

function formatPdfMoney(amount: number) {
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `NGN ${formatted}`;
}

function formatPdfNumber(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function PublicMoney({
  amount,
  fontSize = 10,
  color = "#14213D",
  align = "left",
}: {
  amount: number;
  fontSize?: number;
  color?: string;
  align?: "left" | "right";
}) {
  const markWidth = fontSize * 0.78;
  const markHeight = fontSize * 0.95;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      <Svg
        width={markWidth}
        height={markHeight}
        viewBox="0 0 18 22"
        style={{ marginRight: fontSize * 0.1 }}
      >
        <Line x1={3} y1={21} x2={3} y2={1} stroke={color} strokeWidth={2.7} />
        <Line x1={3} y1={1} x2={15} y2={21} stroke={color} strokeWidth={2.7} />
        <Line x1={15} y1={21} x2={15} y2={1} stroke={color} strokeWidth={2.7} />
        <Line x1={0} y1={9} x2={18} y2={9} stroke={color} strokeWidth={2.2} />
        <Line x1={0} y1={13} x2={18} y2={13} stroke={color} strokeWidth={2.2} />
      </Svg>
      <Text style={{ fontSize, lineHeight: 1.05, fontWeight: 700, color }}>
        {formatPdfNumber(amount)}
      </Text>
    </View>
  );
}

function toTitleCase(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("en-NG")
    .replace(/(^|[\s,./()'-])([\p{L}])/gu, (_, prefix, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase("en-NG")}`,
    );
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

const SMALL_NUMBERS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
] as const;

function numberUnderThousandToWords(value: number): string {
  if (value < 20) return SMALL_NUMBERS[value];
  if (value < 100) {
    const remainder = value % 10;
    return `${TENS[Math.floor(value / 10)]}${
      remainder ? `-${SMALL_NUMBERS[remainder]}` : ""
    }`;
  }
  const remainder = value % 100;
  return `${SMALL_NUMBERS[Math.floor(value / 100)]} hundred${
    remainder ? ` and ${numberUnderThousandToWords(remainder)}` : ""
  }`;
}

function amountInWords(amount: number) {
  const whole = Math.max(0, Math.floor(amount));
  if (whole === 0) return "Zero naira only";

  const groups = [
    { value: 1_000_000_000, label: "billion" },
    { value: 1_000_000, label: "million" },
    { value: 1_000, label: "thousand" },
  ];
  let remainder = whole;
  const words: string[] = [];

  for (const group of groups) {
    const count = Math.floor(remainder / group.value);
    if (count > 0) {
      words.push(`${numberUnderThousandToWords(count)} ${group.label}`);
      remainder %= group.value;
    }
  }
  if (remainder > 0) words.push(numberUnderThousandToWords(remainder));

  const sentence = `${words.join(", ")} naira only`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function getReceiptImages(receipt: PublicGeneratedReceiptRow) {
  const signatures = receipt.receipt_snapshot.signatures;
  if (!signatures || typeof signatures !== "object") {
    return { landlord: null, stamp: null };
  }

  const values = signatures as Record<string, unknown>;
  const image = (value: unknown) =>
    typeof value === "string" && value.startsWith("data:image/")
      ? value
      : null;

  return {
    landlord: image(values.landlord),
    stamp: image(values.stamp),
  };
}

function getPublicReceiptFinancials(receipt: PublicGeneratedReceiptRow) {
  const payment = receipt.receipt_snapshot.payment;
  const values =
    payment && typeof payment === "object"
      ? (payment as Record<string, unknown>)
      : {};
  const paid = Number(receipt.rent_amount);
  const storedTotalDue = Number(values.total_rent_due);
  const storedBalance = Number(values.balance_outstanding);
  const totalDue = Number.isFinite(storedTotalDue) ? storedTotalDue : paid;
  const balanceOutstanding = Number.isFinite(storedBalance)
    ? storedBalance
    : Math.max(0, totalDue - paid);

  return { paid, totalDue, balanceOutstanding };
}

function getStampPropertyName(propertyName: string | null) {
  const normalized = (propertyName ?? "Property").trim().toUpperCase();
  return normalized.length > 20
    ? `${normalized.slice(0, 19).trimEnd()}...`
    : normalized;
}

function formatStampDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value}T00:00:00.000Z`))
    .toUpperCase();
}

function StampArcText({
  text,
  startAngle,
  endAngle,
  radius,
  rotationOffset = 90,
}: {
  text: string;
  startAngle: number;
  endAngle: number;
  radius: number;
  rotationOffset?: number;
}) {
  const characters = Array.from(text);
  const divisor = Math.max(characters.length - 1, 1);

  return (
    <>
      {characters.map((character, index) => {
        const angle = startAngle + ((endAngle - startAngle) * index) / divisor;
        const radians = (angle * Math.PI) / 180;
        const x = 50 + radius * Math.cos(radians);
        const y = 50 + radius * Math.sin(radians);

        return (
          <Text
            key={`${character}-${index}`}
            x={x}
            y={y}
            fill="#176B4A"
            style={{ fontSize: 5.2, fontWeight: 700 }}
            textAnchor="middle"
            transform={`rotate(${angle + rotationOffset} ${x} ${y})`}
          >
            {character}
          </Text>
        );
      })}
    </>
  );
}

function PaidReceiptStamp({ receipt }: { receipt: PublicGeneratedReceiptRow }) {
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <G transform="rotate(-7 50 50)">
        <Circle
          cx={50}
          cy={50}
          r={45}
          fill="none"
          stroke="#176B4A"
          strokeWidth={2}
        />
        <Circle
          cx={50}
          cy={50}
          r={30}
          fill="none"
          stroke="#176B4A"
          strokeWidth={1}
        />
        <StampArcText
          text={getStampPropertyName(receipt.property_name)}
          startAngle={-145}
          endAngle={-35}
          radius={39}
        />
        <StampArcText
          text={Array.from("OFFICIAL RECEIPT").reverse().join("")}
          startAngle={30}
          endAngle={150}
          radius={38}
          rotationOffset={-90}
        />
        <Text
          x={50}
          y={49}
          fill="#176B4A"
          style={{ fontSize: 17, fontWeight: 700 }}
          textAnchor="middle"
        >
          PAID
        </Text>
        <Text
          x={50}
          y={59}
          fill="#176B4A"
          style={{ fontSize: 5.8, fontWeight: 700 }}
          textAnchor="middle"
        >
          {formatStampDate(receipt.payment_date)}
        </Text>
        <Circle cx={50} cy={84} r={1.1} fill="#176B4A" />
      </G>
    </Svg>
  );
}

function PublicDetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={styles.publicDetailRow}>
      <Text style={styles.publicDetailLabel}>{label}</Text>
      <View style={styles.publicDetailValue}>
        {typeof value === "string" ? <Text>{value}</Text> : value}
      </View>
    </View>
  );
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
    toTitleCase(receipt.property_name),
    toTitleCase(receipt.unit_identifier),
    toTitleCase(receipt.property_address),
    toTitleCase(receipt.city_state),
  ]
    .filter(Boolean)
    .join(", ");
  const isPro = receipt.metadata.receipt_tier === "paid";
  const images = getReceiptImages(receipt);
  const financials = getPublicReceiptFinancials(receipt);
  const accent = isPro ? "#176B4A" : "#2457D6";
  const amountBackground = isPro ? "#E6F1EB" : "#EAF0FF";
  const paymentFor = `${receipt.rent_duration_months}-month rent`;

  return (
    <Document
      title="Rent Receipt"
      author="Boldverse Property"
      subject="Public Rent Receipt"
    >
      <Page size="A4" style={styles.publicPage}>
        <View
          style={[styles.publicHeader, { borderBottomColor: accent }]}
        >
          <View style={{ width: "62%" }}>
            <Text style={[styles.publicPropertyName, { color: accent }]}>
              {toTitleCase(receipt.property_name) || "Property"}
            </Text>
            {isPro ? (
              <Text style={{ color: "#596174", fontSize: 10 }}>
                {[
                  receipt.unit_identifier,
                  receipt.property_address,
                  receipt.city_state,
                ]
                  .filter(Boolean)
                  .map((value) => toTitleCase(value))
                  .join(", ")}
              </Text>
            ) : (
              <Text style={styles.publicTitle}>Rent Receipt</Text>
            )}
          </View>
          <View style={styles.publicMetaBlock}>
            <Text>Receipt no.</Text>
            <Text style={styles.publicMetaValue}>{receipt.receipt_number}</Text>
            <Text style={{ marginTop: 5 }}>Date issued</Text>
            <Text style={styles.publicMetaValue}>
              {formatDate(receipt.created_at)}
            </Text>
          </View>
        </View>

        {isPro ? (
          <View
            style={{
              marginTop: 20,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.publicTitle}>Rent Receipt</Text>
            <View
              style={{
                backgroundColor: "#E6F1EB",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: accent, fontWeight: 700 }}>
                {financials.balanceOutstanding === 0
                  ? "Paid in full"
                  : "Part payment"}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.publicAmountBox,
            { backgroundColor: amountBackground },
          ]}
        >
          <View style={styles.publicAmountRow}>
            <View style={{ width: isPro ? "72%" : "100%" }}>
              <Text style={[styles.publicAmountLabel, { color: accent }]}>
                AMOUNT RECEIVED
              </Text>
              <PublicMoney amount={financials.paid} fontSize={31} />
              <Text style={styles.publicAmountWords}>
                {amountInWords(financials.paid)}
              </Text>
            </View>
            {isPro ? (
              <View style={{ width: "25%", alignItems: "flex-end" }}>
                <Text style={{ color: "#596174", fontSize: 9 }}>
                  Balance outstanding
                </Text>
                <View style={{ marginTop: 5 }}>
                  <PublicMoney
                    amount={financials.balanceOutstanding}
                    fontSize={15}
                    align="right"
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.publicPeopleRow}>
          <View style={styles.publicPersonCard}>
            <Text style={styles.publicPersonLabel}>RECEIVED FROM (TENANT)</Text>
            <Text style={styles.publicPersonName}>
              {toTitleCase(receipt.tenant_full_name)}
            </Text>
            <Text style={styles.publicPersonPhone}>
              {receipt.tenant_phone_number}
            </Text>
          </View>
          <View style={styles.publicPersonCard}>
            <Text style={styles.publicPersonLabel}>RECEIVED BY (LANDLORD)</Text>
            <Text style={styles.publicPersonName}>
              {toTitleCase(receipt.landlord_full_name)}
            </Text>
            <Text style={styles.publicPersonPhone}>
              {receipt.landlord_phone_number}
            </Text>
          </View>
        </View>

        <View style={styles.publicDetails}>
          {!isPro ? <PublicDetailRow label="Property" value={propertyLabel} /> : null}
          {!isPro ? (
            <>
              <PublicDetailRow
                label="Total rent due"
                value={<PublicMoney amount={financials.totalDue} />}
              />
              <PublicDetailRow
                label="Rent paid"
                value={<PublicMoney amount={financials.paid} />}
              />
              <PublicDetailRow
                label="Balance outstanding"
                value={<PublicMoney amount={financials.balanceOutstanding} />}
              />
            </>
          ) : null}
          <PublicDetailRow label="Payment for" value={paymentFor} />
          <PublicDetailRow
            label="Rent covers"
            value={`${formatDate(receipt.rent_period_start)} to ${formatDate(
              receipt.rent_period_end,
            )}`}
          />
          <PublicDetailRow
            label="Date paid"
            value={formatDate(receipt.payment_date)}
          />
          <PublicDetailRow
            label="Payment method"
            value={publicPaymentMethodLabel(receipt.payment_method)}
          />
          {isPro && receipt.payment_reference ? (
            <PublicDetailRow
              label="Payment reference"
              value={receipt.payment_reference}
            />
          ) : null}
        </View>

        <View style={styles.publicSignatures}>
          <View style={{ width: isPro ? "100%" : "65%" }}>
            <View style={styles.publicSignatureBox}>
              {images.landlord ? (
                <Image
                  src={images.landlord}
                  style={styles.publicSignatureImage}
                />
              ) : (
                <Text style={styles.publicSignatureText}>
                  {toTitleCase(receipt.landlord_full_name)}
                </Text>
              )}
            </View>
            <Text style={styles.publicSignatureLabel}>Landlord&apos;s signature</Text>
          </View>

          {isPro ? (
            <View
              style={{
                position: "absolute",
                right: 4,
                bottom: 8,
                width: 104,
                height: 104,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {images.stamp ? (
                <Image src={images.stamp} style={styles.publicStampImage} />
              ) : (
                <PaidReceiptStamp receipt={receipt} />
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.publicFooter}>
          <Text style={{ width: "62%" }}>
            {isPro
              ? `${toTitleCase(receipt.property_name) || "Property"} · ${toTitleCase(receipt.landlord_full_name)} · ${receipt.landlord_phone_number}`
              : "This receipt was prepared by the landlord using Boldverse Property's free receipt tool. Boldverse Property does not hold or confirm payments."}
          </Text>
          <Text style={{ width: "36%", textAlign: "right", fontWeight: 700 }}>
            {isPro
              ? `Receipt ${receipt.receipt_number}`
              : "Powered by Boldverse Property"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderRentReceiptPdf(
  payment: RentPaymentRow,
  breakdown?: RentReceiptPaymentBreakdown,
) {
  const paymentBreakdown: RentReceiptPaymentBreakdown = breakdown ?? {
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
