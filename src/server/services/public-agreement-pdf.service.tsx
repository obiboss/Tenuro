import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { PublicGeneratedAgreementRow } from "@/server/repositories/public-agreement-generator.repository";

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 58, fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.48, color: "#181818" },
  center: { textAlign: "center" },
  bold: { fontFamily: "Times-Bold" },
  rule: { borderBottomWidth: 1, borderBottomColor: "#555" },
  coverParties: { marginTop: 142, alignItems: "center" },
  coverName: { marginTop: 15, fontFamily: "Times-Bold", fontSize: 15 },
  coverTitle: { marginTop: 28, paddingVertical: 15, borderTopWidth: 2, borderBottomWidth: 1, borderColor: "#555", fontFamily: "Times-Bold", fontSize: 21, letterSpacing: 3, textAlign: "center" },
  title: { fontFamily: "Times-Bold", fontSize: 14, textAlign: "center", textDecoration: "underline", marginBottom: 18 },
  heading: { marginTop: 12, marginBottom: 6, fontFamily: "Times-Bold" },
  paragraph: { marginBottom: 6, textAlign: "justify" },
  list: { marginLeft: 20, marginBottom: 3 },
  signatures: { flexDirection: "row", gap: 26, marginTop: 16 },
  signatureColumn: { flex: 1 },
  signatureLine: { marginTop: 28, borderBottomWidth: 1, borderBottomColor: "#555" },
  witnessLine: { marginTop: 9, height: 17, borderBottomWidth: 1, borderBottomColor: "#777" },
  footer: { position: "absolute", left: 58, right: 58, bottom: 26, flexDirection: "row", justifyContent: "space-between", fontSize: 8 },
});

function data(snapshot: Record<string, unknown>, key: string): Record<string, unknown> {
  const item = snapshot[key];
  return item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
}

function value(record: Record<string, unknown>, key: string): string {
  const item = record[key];
  return typeof item === "string" ? item.trim() : "";
}

function clausesFromBody(body: string) {
  const clauses = new Map<number, string>();
  const matches = [...body.matchAll(/^(\d{1,2})\. ([A-Z][A-Z /’'-]+)\n/gm)];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[i + 1]?.index ?? body.length;
    clauses.set(Number(match[1]), `${match[1]}. ${match[2]}\n${body.slice(start, end)}`.split("SIGNED:")[0].trim());
  }
  return clauses;
}

function Clause({ text }: { text: string }) {
  const [heading, ...lines] = text.replace(/\u20A6/g, "NGN ").split("\n");
  return <View wrap={false}>
    <Text style={styles.heading}>{heading}</Text>
    {lines.map((line, i) => {
      const clean = line.trim();
      if (!clean) return null;
      return <Text key={`${i}-${clean}`} style={/^(?:-|[a-i]\.) /.test(clean) ? styles.list : styles.paragraph}>{clean}</Text>;
    })}
  </View>;
}

function Footer({ number, pro }: { number: number; pro: boolean }) {
  return <View fixed style={styles.footer}>
    <Text>{pro ? "Tenancy Agreement" : "Generated with BOPA - boldverseproperty.com"}</Text>
    <Text>Page {number} of 4</Text>
  </View>;
}

function PublicAgreementPdfDocument({ agreement }: { agreement: PublicGeneratedAgreementRow }) {
  const snapshot = agreement.agreement_snapshot;
  const landlord = data(snapshot, "landlord_snapshot");
  const tenant = data(snapshot, "tenant_snapshot");
  const property = data(snapshot, "property_snapshot");
  const landlordName = value(landlord, "fullName") || agreement.landlord_full_name;
  const tenantName = value(tenant, "fullName") || agreement.tenant_full_name;
  const propertyAddress = [value(property, "propertyName"), value(property, "unitIdentifier"), value(property, "address"), value(property, "cityState")].filter(Boolean).join(", ");
  const contact = [value(landlord, "address"), value(landlord, "phoneNumber"), value(landlord, "email")].filter(Boolean).join("  |  ");
  const clauses = clausesFromBody(value(snapshot, "agreement_body"));
  const pro = agreement.metadata.agreement_tier === "paid";
  const createdAt = new Date(agreement.created_at);
  const agreementDate = Number.isNaN(createdAt.getTime())
    ? "the date this document was generated"
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(createdAt);
  const show = (numbers: number[]) => numbers.map((number) => clauses.has(number) ? <Clause key={number} text={clauses.get(number)!} /> : null);

  return <Document title={agreement.agreement_title} author="Boldverse Property" subject="Tenancy Agreement">
    <Page size="A4" style={styles.page}>
      <Text style={[styles.center, styles.bold, { fontSize: 14, letterSpacing: 1 }]}>{landlordName.toUpperCase()}</Text>
      {contact ? <Text style={[styles.center, { marginTop: 3, fontSize: 9 }]}>{contact}</Text> : null}
      <View style={[styles.rule, { marginTop: 12 }]} />
      <View style={styles.coverParties}>
        <Text style={[styles.bold, { marginBottom: 25 }]}>DATED {agreementDate.toUpperCase()}</Text>
        <Text>BETWEEN</Text>
        <Text style={styles.coverName}>{landlordName.toUpperCase()}</Text><Text>(LANDLORD)</Text>
        <Text style={{ marginTop: 18 }}>AND</Text>
        <Text style={styles.coverName}>{tenantName.toUpperCase()}</Text><Text>(TENANT)</Text>
      </View>
      <Text style={styles.coverTitle}>TENANCY AGREEMENT</Text>
      <Text style={[styles.center, { marginTop: 20 }]}>IN RESPECT OF</Text>
      <Text style={[styles.center, styles.bold, { marginTop: 12, fontSize: 12 }]}>{propertyAddress.toUpperCase()}</Text>
      <Footer number={1} pro={pro} />
    </Page>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>TENANCY AGREEMENT</Text>
      <Text style={styles.paragraph}>THIS AGREEMENT is made on {agreementDate} between {landlordName} (the Landlord) and {tenantName} (the Tenant) in respect of {propertyAddress} (the Premises).</Text>
      <Text style={styles.heading}>BACKGROUND</Text>
      <Text style={styles.paragraph}>The Landlord agrees to let, and the Tenant agrees to take, the Premises on the terms of this Agreement.</Text>
      <Text style={styles.heading}>THE PARTIES AGREE as follows:</Text>
      {show([1, 2, 3, 4])}
      <Footer number={2} pro={pro} />
    </Page>
    <Page size="A4" style={styles.page}>
      {show([5, 6, 7, 8, 9, 10, 11])}
      <Footer number={3} pro={pro} />
    </Page>
    <Page size="A4" style={styles.page}>
      {show([12, 13, 14, 15, 16])}
      <Text style={[styles.heading, { marginTop: 17 }]}>SIGNED by the parties</Text>
      <View style={styles.signatures} wrap={false}>
        {[["LANDLORD", landlordName], ["TENANT", tenantName]].map(([role, name]) => <View key={role} style={styles.signatureColumn}>
          <Text style={styles.bold}>SIGNED by the {role}</Text><Text>{name.toUpperCase()}</Text>
          <View style={styles.signatureLine} />
          <Text style={{ marginTop: 10, fontStyle: "italic" }}>in the presence of:</Text>
          {["Name", "Address", "Occupation", "Signature"].map((label) => <View key={label} style={styles.witnessLine}><Text>{label}:</Text></View>)}
        </View>)}
      </View>
      <Footer number={4} pro={pro} />
    </Page>
  </Document>;
}

export async function renderPublicGeneratedAgreementPdf(agreement: PublicGeneratedAgreementRow) {
  return renderToBuffer(<PublicAgreementPdfDocument agreement={agreement} />);
}
