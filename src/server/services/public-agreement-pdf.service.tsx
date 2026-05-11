import "server-only";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { PublicGeneratedAgreementRow } from "@/server/repositories/public-agreement-generator.repository";

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.55,
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
    color: "#111827",
  },
  meta: {
    marginTop: 6,
    fontSize: 8,
    color: "#6B7280",
  },
  section: {
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 7,
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

function toSafeText(value: string) {
  return value.replace(/\u20A6/g, "NGN ");
}

function getSnapshotText(
  snapshot: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = snapshot[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function getAgreementBody(agreement: PublicGeneratedAgreementRow) {
  return getSnapshotText(
    agreement.agreement_snapshot,
    "agreement_body",
    "Agreement body is not available.",
  );
}

function splitBody(value: string) {
  return toSafeText(value)
    .split("\n")
    .map((line) => line.trimEnd());
}

function PublicAgreementPdfDocument({
  agreement,
}: {
  agreement: PublicGeneratedAgreementRow;
}) {
  const body = getAgreementBody(agreement);

  return (
    <Document
      title={agreement.agreement_title}
      author="Boldverse Property"
      subject="Public Tenancy Agreement Preview"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Boldverse Property</Text>
          <Text style={styles.title}>{agreement.agreement_title}</Text>
          <Text style={styles.meta}>
            Agreement ID: {agreement.id} | Status: {agreement.document_status}
          </Text>
        </View>

        <View style={styles.section}>
          {splitBody(body).map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.paragraph}>
              {line || " "}
            </Text>
          ))}
        </View>

        <Text style={styles.footer}>
          Generated with BOPA — boldverseproperty.com
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPublicGeneratedAgreementPdf(
  agreement: PublicGeneratedAgreementRow,
) {
  return renderToBuffer(<PublicAgreementPdfDocument agreement={agreement} />);
}
