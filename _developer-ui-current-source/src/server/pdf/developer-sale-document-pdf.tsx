import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

export type DeveloperSaleDocumentPdfData = {
  title: string;
  subtitle: string;
  body: string;
  notice: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontSize: 10,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    lineHeight: 1.55,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1D4ED8",
    color: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 21,
    fontWeight: 700,
    marginRight: 12,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  },
  brandSubtitle: {
    marginTop: 3,
    fontSize: 8,
    color: "#6B7280",
  },
  titleBlock: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    marginBottom: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1D4ED8",
  },
  subtitle: {
    marginTop: 5,
    fontSize: 9,
    color: "#374151",
  },
  paragraph: {
    marginBottom: 8,
    fontSize: 10,
    color: "#111827",
  },
  notice: {
    marginTop: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    fontSize: 8,
    color: "#6B7280",
    lineHeight: 1.5,
  },
});

function splitBody(body: string) {
  return body
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function DeveloperSaleDocumentPdf({
  data,
}: {
  data: DeveloperSaleDocumentPdfData;
}) {
  return (
    <Document
      author="Boldverse Property"
      creator="Boldverse Property"
      producer="Boldverse Property"
      title={data.title}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text>B</Text>
          </View>

          <View>
            <Text style={styles.brandTitle}>Boldverse Property</Text>
            <Text style={styles.brandSubtitle}>
              Developer sale document digital copy
            </Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>{data.subtitle}</Text>
        </View>

        {splitBody(data.body).map((line, index) => (
          <Text key={`${line}-${index}`} style={styles.paragraph}>
            {line}
          </Text>
        ))}

        <Text style={styles.notice}>{data.notice}</Text>
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

export async function renderDeveloperSaleDocumentPdfBuffer(
  data: DeveloperSaleDocumentPdfData,
) {
  const output = await pdf(<DeveloperSaleDocumentPdf data={data} />).toBuffer();

  return normalisePdfOutputToBuffer(output);
}
