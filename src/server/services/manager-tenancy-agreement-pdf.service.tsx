import "server-only";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";
import type { ManagerTenantAgreementDocumentRow } from "@/server/repositories/manager-tenant-onboarding.repository";
import { updateManagerTenantAgreementPdfPath } from "@/server/repositories/manager-tenant-onboarding.repository";
import {
  downloadTenancyAgreementPdf,
  uploadTenancyAgreementPdf,
} from "@/server/services/storage.service";

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#172033",
    lineHeight: 1.55,
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#DDE5F2",
    borderBottomStyle: "solid",
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0B5FFF",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
  },
  meta: {
    marginTop: 6,
    fontSize: 8,
    color: "#64748B",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#0F172A",
  },
  summaryGrid: {
    borderWidth: 1,
    borderColor: "#DDE5F2",
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E6ECF5",
  },
  firstRow: {
    flexDirection: "row",
  },
  label: {
    width: "34%",
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 8,
    color: "#64748B",
    backgroundColor: "#F8FAFC",
  },
  value: {
    width: "66%",
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 8,
    color: "#172033",
    fontWeight: 600,
  },
  paragraph: {
    marginBottom: 7,
    fontSize: 9.5,
  },
  acceptanceBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    color: "#166534",
    fontSize: 8.5,
  },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DDE5F2",
    borderTopStyle: "solid",
    fontSize: 8,
    color: "#64748B",
  },
});

function toSafePdfText(value: string) {
  return value.replace(/\u20A6/g, "NGN ");
}

function readText(
  snapshot: Record<string, unknown>,
  key: string,
  fallback = "Not stated",
) {
  const value = snapshot[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readNumber(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function SummaryRow({
  label,
  value,
  first = false,
}: {
  label: string;
  value: string;
  first?: boolean;
}) {
  return (
    <View style={first ? styles.firstRow : styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function ManagerAgreementPdfDocument({
  agreement,
}: {
  agreement: ManagerTenantAgreementDocumentRow;
}) {
  const body = agreement.finalized_body || agreement.agreement_body || "";
  const managerName = readText(agreement.manager_snapshot, "name", "BOPA Manager");
  const landlordName = readText(agreement.landlord_snapshot, "name");
  const tenantName = readText(agreement.tenant_snapshot, "fullName", "Tenant");
  const tenantPhone = readText(agreement.tenant_snapshot, "phoneNumber");
  const propertyName = readText(agreement.property_snapshot, "propertyName");
  const propertyAddress = readText(
    agreement.property_snapshot,
    "propertyAddress",
  );
  const unitLabel = readText(agreement.property_snapshot, "unitLabel", "Unit");
  const rentAmount = readNumber(agreement.tenancy_snapshot, "rentAmount");
  const moveInDate = readText(agreement.tenancy_snapshot, "moveInDate", "");
  const nextRentDueDate = readText(
    agreement.tenancy_snapshot,
    "nextRentDueDate",
    "",
  );

  return (
    <Document
      title={agreement.title}
      author={managerName}
      subject="Tenancy Agreement"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>BOPA Manager</Text>
          <Text style={styles.title}>{agreement.title}</Text>
          <Text style={styles.meta}>
            Agreement reference: {agreement.id} | Status:{" "}
            {agreement.document_status} | Accepted:{" "}
            {formatDateTime(agreement.tenant_accepted_at)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement summary</Text>
          <View style={styles.summaryGrid}>
            <SummaryRow first label="Manager" value={managerName} />
            <SummaryRow label="Landlord" value={landlordName} />
            <SummaryRow label="Tenant" value={`${tenantName} - ${tenantPhone}`} />
            <SummaryRow
              label="Property"
              value={`${propertyName} - ${propertyAddress}`}
            />
            <SummaryRow label="Unit" value={unitLabel} />
            <SummaryRow label="Rent amount" value={formatMoney(rentAmount)} />
            <SummaryRow label="Tenancy start" value={formatDate(moveInDate)} />
            <SummaryRow
              label="Next rent due"
              value={formatDate(nextRentDueDate)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final agreement terms</Text>
          {toSafePdfText(body)
            .split("\n")
            .map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.paragraph}>
                {line || " "}
              </Text>
            ))}
        </View>

        <Text style={styles.acceptanceBox}>
          Tenant acceptance recorded on{" "}
          {formatDateTime(agreement.tenant_accepted_at)}. This PDF uses the
          saved final agreement content and the system acceptance record.
        </Text>

        <Text style={styles.footer}>
          Powered by BOPA - Boldverse Property App
        </Text>
      </Page>
    </Document>
  );
}

function createManagerAgreementPdfPath(
  agreement: ManagerTenantAgreementDocumentRow,
) {
  return [
    "manager",
    agreement.organization_id,
    agreement.tenant_id,
    agreement.id,
    "tenancy-agreement.pdf",
  ].join("/");
}

function createManagerAgreementFileName(
  agreement: ManagerTenantAgreementDocumentRow,
) {
  return `bopa-manager-agreement-${agreement.id}.pdf`;
}

export async function generateAndStoreManagerTenancyAgreementPdf(
  supabase: SupabaseClient,
  agreement: ManagerTenantAgreementDocumentRow,
) {
  if (agreement.document_status !== "accepted") {
    throw new AppError(
      "MANAGER_AGREEMENT_PDF_NOT_READY",
      "Agreement PDF is available after tenant acceptance.",
      400,
    );
  }

  const pdfBuffer = await renderToBuffer(
    <ManagerAgreementPdfDocument agreement={agreement} />,
  );
  const pdfPath = createManagerAgreementPdfPath(agreement);

  await uploadTenancyAgreementPdf({
    path: pdfPath,
    pdfBuffer,
  });

  return updateManagerTenantAgreementPdfPath(supabase, {
    agreementId: agreement.id,
    pdfPath,
  });
}

export async function ensureManagerTenancyAgreementPdf(
  supabase: SupabaseClient,
  agreement: ManagerTenantAgreementDocumentRow,
) {
  if (agreement.pdf_path) {
    return agreement;
  }

  return generateAndStoreManagerTenancyAgreementPdf(supabase, agreement);
}

export async function getManagerTenancyAgreementPdfDownload(params: {
  supabase: SupabaseClient;
  agreement: ManagerTenantAgreementDocumentRow;
}) {
  const agreement = await ensureManagerTenancyAgreementPdf(
    params.supabase,
    params.agreement,
  );
  const fileBuffer = await downloadTenancyAgreementPdf(agreement.pdf_path);

  return {
    agreement,
    fileBuffer,
    fileName: createManagerAgreementFileName(agreement),
  };
}
