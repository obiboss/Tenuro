import "server-only";

import crypto from "node:crypto";
import { Readable } from "node:stream";
import { pdf } from "@react-pdf/renderer";
import { AppError } from "@/server/errors/app-error";
import { ManagerLandlordStatementPdf } from "@/server/pdf/manager-landlord-statement-pdf";
import { ManagerPropertyReportPdf } from "@/server/pdf/manager-property-report-pdf";
import { ManagerRemittanceSummaryPdf } from "@/server/pdf/manager-remittance-summary-pdf";
import { createManagerDocumentShareLink } from "@/server/repositories/manager-document-share-links.repository";
import {
  getManagerLandlordStatementSnapshot,
  getManagerPropertyReportSnapshot,
  getManagerStatementDocumentById,
  MANAGER_STATEMENT_DOCUMENTS_BUCKET,
  upsertManagerStatementDocument,
  type ManagerLandlordStatementSnapshot,
  type ManagerPropertyReportSnapshot,
  type ManagerStatementDocumentType,
} from "@/server/repositories/manager-statement-documents.repository";
import {
  createManagerDocumentShareToken,
  getManagerDocumentShareExpiry,
  hashManagerDocumentShareToken,
} from "@/server/security/manager-document-share-token";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type {
  ManagerPropertyReportQueryInput,
  ManagerStatementDocumentQueryInput,
} from "@/server/validators/manager-statement-documents.schema";

type ManagerStatementDownload = {
  fileName: string;
  fileBuffer: ArrayBuffer;
};

export type ManagerStatementShareLink = {
  whatsappUrl: string;
};

type WebPdfReadableStream =
  ReadableStream<Uint8Array<ArrayBufferLike>>;
type PdfOutput = Buffer | Readable | WebPdfReadableStream;

function createHash(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 16);
}

function createDocumentNumber(params: {
  documentType: ManagerStatementDocumentType;
  landlordClientId: string;
  propertyId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}) {
  const prefix =
    params.documentType === "landlord_statement"
      ? "BMS"
      : params.documentType === "remittance_summary"
        ? "BMR"
        : "BPR";
  const dateScope =
    `${params.dateFrom ?? "start"}-${params.dateTo ?? "today"}`;
  const shortHash = createHash(
    [
      params.landlordClientId,
      params.propertyId ?? "all-properties",
      dateScope,
    ].join(":"),
  ).toUpperCase();

  return `${prefix}-${shortHash}`;
}

function createIdempotencyKey(params: {
  organizationId: string;
  landlordClientId: string;
  propertyId: string | null;
  documentType: ManagerStatementDocumentType;
  dateFrom: string | null;
  dateTo: string | null;
}) {
  return [
    "manager-statement-document",
    params.documentType,
    params.organizationId,
    params.landlordClientId,
    params.propertyId ?? "all-properties",
    params.dateFrom ?? "start",
    params.dateTo ?? "today",
  ].join(":");
}

function createFileName(params: {
  documentType: ManagerStatementDocumentType;
  documentNumber: string;
}) {
  const label =
    params.documentType === "landlord_statement"
      ? "landlord-statement"
      : params.documentType === "remittance_summary"
        ? "remittance-summary"
        : "property-report";

  return `${label}-${params.documentNumber}.pdf`;
}

function createStoragePath(params: {
  organizationId: string;
  landlordClientId: string;
  propertyId: string | null;
  documentType: ManagerStatementDocumentType;
  fileName: string;
}) {
  const propertyScope =
    params.propertyId ?? "all-properties";

  return [
    params.organizationId,
    params.landlordClientId,
    propertyScope,
    params.documentType,
    params.fileName,
  ].join("/");
}

function isWebReadableStream(
  output: PdfOutput,
): output is WebPdfReadableStream {
  return (
    typeof (output as { getReader?: unknown }).getReader ===
    "function"
  );
}

function isNodeReadableStream(
  output: PdfOutput,
): output is Readable {
  return output instanceof Readable;
}

async function webReadableStreamToBuffer(
  stream: WebPdfReadableStream,
) {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];

  try {
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (result.value) {
        chunks.push(Buffer.from(result.value));
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

async function nodeReadableStreamToBuffer(stream: Readable) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream as AsyncIterable<unknown>) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
      continue;
    }

    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
      continue;
    }

    if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
      continue;
    }

    chunks.push(Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks);
}

async function pdfOutputToBuffer(output: PdfOutput) {
  if (Buffer.isBuffer(output)) {
    return output;
  }

  if (isWebReadableStream(output)) {
    return webReadableStreamToBuffer(output);
  }

  if (isNodeReadableStream(output)) {
    return nodeReadableStreamToBuffer(output);
  }

  throw new AppError(
    "MANAGER_STATEMENT_PDF_RENDER_FAILED",
    "Document could not be prepared.",
    500,
  );
}

async function renderLandlordDocumentBuffer(params: {
  documentType: "landlord_statement" | "remittance_summary";
  documentNumber: string;
  snapshot: ManagerLandlordStatementSnapshot;
}) {
  const document =
    params.documentType === "landlord_statement" ? (
      <ManagerLandlordStatementPdf
        documentNumber={params.documentNumber}
        snapshot={params.snapshot}
      />
    ) : (
      <ManagerRemittanceSummaryPdf
        documentNumber={params.documentNumber}
        snapshot={params.snapshot}
      />
    );

  const rendered = (await pdf(document).toBuffer()) as PdfOutput;

  return pdfOutputToBuffer(rendered);
}

async function renderPropertyDocumentBuffer(params: {
  documentNumber: string;
  snapshot: ManagerPropertyReportSnapshot;
}) {
  const rendered = (await pdf(
    <ManagerPropertyReportPdf
      documentNumber={params.documentNumber}
      snapshot={params.snapshot}
    />,
  ).toBuffer()) as PdfOutput;

  return pdfOutputToBuffer(rendered);
}

async function uploadPdf(params: {
  storagePath: string;
  fileBuffer: Buffer;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(MANAGER_STATEMENT_DOCUMENTS_BUCKET)
    .upload(params.storagePath, params.fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

async function downloadPdf(storagePath: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(MANAGER_STATEMENT_DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw error;
  }

  return data.arrayBuffer();
}

function normalizeWhatsAppPhone(phoneNumber: string | null) {
  if (!phoneNumber) {
    return null;
  }

  const cleaned = phoneNumber.replace(/\D/g, "");

  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith("234")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return `234${cleaned.slice(1)}`;
  }

  return cleaned;
}

function buildWhatsAppUrl(params: {
  phoneNumber: string;
  message: string;
}) {
  return `https://wa.me/${params.phoneNumber}?text=${encodeURIComponent(
    params.message,
  )}`;
}

function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BOPA_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "");

  if (!configuredUrl) {
    throw new AppError(
      "APP_URL_MISSING",
      "App URL is not configured.",
      500,
    );
  }

  return configuredUrl.replace(/\/$/, "");
}

async function createPrivateManagerDocumentShareUrl(params: {
  document: {
    id: string;
    organization_id: string;
    landlord_client_id: string;
    document_type: ManagerStatementDocumentType;
    document_number: string;
  };
  createdByProfileId: string;
}) {
  const rawToken = createManagerDocumentShareToken();
  const expiresAt = getManagerDocumentShareExpiry();

  await createManagerDocumentShareLink(
    createSupabaseAdminClient(),
    {
      organizationId:
        params.document.organization_id,
      landlordClientId:
        params.document.landlord_client_id,
      statementDocumentId: params.document.id,
      tokenHash:
        hashManagerDocumentShareToken(rawToken),
      expiresAt,
      createdByProfileId:
        params.createdByProfileId,
      maxAccessCount: 100,
      metadata: {
        source: "bopa_manager_report_whatsapp_share",
        document_type:
          params.document.document_type,
        document_number:
          params.document.document_number,
      },
    },
  );

  return `${getAppBaseUrl()}/m/report/${encodeURIComponent(
    rawToken,
  )}`;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

async function requireManagerStatementAccess(
  managerProfileId: string,
) {
  const { manager, access } =
    await requireManagerWorkspacePermission("reports.view");

  if (manager.id !== managerProfileId) {
    throw new AppError(
      "MANAGER_SESSION_MISMATCH",
      "Please sign in again to continue.",
      401,
    );
  }

  if (
    !access.organization ||
    access.organization.status !== "active"
  ) {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Create or join an active BOPA Manager organization before continuing.",
      403,
    );
  }

  return access.organization;
}

export async function generateManagerStatementDocument(params: {
  managerProfileId: string;
  documentType:
    | "landlord_statement"
    | "remittance_summary";
  input: ManagerStatementDocumentQueryInput;
}) {
  const organization = await requireManagerStatementAccess(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const snapshot =
    await getManagerLandlordStatementSnapshot(adminSupabase, {
      organizationId: organization.id,
      landlordClientId: params.input.landlordClientId,
      dateFrom: params.input.dateFrom,
      dateTo: params.input.dateTo,
    });

  if (!snapshot) {
    throw new AppError(
      "MANAGER_STATEMENT_NOT_FOUND",
      "Statement details could not be found.",
      404,
    );
  }

  const documentNumber = createDocumentNumber({
    documentType: params.documentType,
    landlordClientId: snapshot.landlord.id,
    propertyId: null,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
  });
  const fileName = createFileName({
    documentType: params.documentType,
    documentNumber,
  });
  const storagePath = createStoragePath({
    organizationId: organization.id,
    landlordClientId: snapshot.landlord.id,
    propertyId: null,
    documentType: params.documentType,
    fileName,
  });
  const idempotencyKey = createIdempotencyKey({
    organizationId: organization.id,
    landlordClientId: snapshot.landlord.id,
    propertyId: null,
    documentType: params.documentType,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
  });
  const fileBuffer = await renderLandlordDocumentBuffer({
    documentType: params.documentType,
    documentNumber,
    snapshot,
  });

  await uploadPdf({
    storagePath,
    fileBuffer,
  });

  return upsertManagerStatementDocument(adminSupabase, {
    organizationId: organization.id,
    landlordClientId: snapshot.landlord.id,
    propertyId: null,
    documentType: params.documentType,
    idempotencyKey,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
    documentNumber,
    storagePath,
    fileName,
    generatedByProfileId: params.managerProfileId,
    metadata: {
      source: "bopa_manager_statement_generation",
      document_type: params.documentType,
      landlord_name: snapshot.landlord.name,
      manager_company_name: snapshot.organization.name,
      date_from: params.input.dateFrom,
      date_to: params.input.dateTo,
      total_rent_recorded:
        snapshot.totals.totalRentRecorded,
      manager_commission:
        snapshot.totals.managerCommission,
      amount_due_to_landlord:
        snapshot.totals.amountDueToLandlord,
      amount_remitted: snapshot.totals.amountRemitted,
      balance_due:
        snapshot.totals.pendingLandlordBalance,
      powered_by: "BOPA - Boldverse Property App",
    },
  });
}

export async function generateManagerPropertyReportDocument(
  params: {
    managerProfileId: string;
    input: ManagerPropertyReportQueryInput;
  },
) {
  const organization = await requireManagerStatementAccess(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const snapshot = await getManagerPropertyReportSnapshot(
    adminSupabase,
    {
      organizationId: organization.id,
      propertyId: params.input.propertyId,
      dateFrom: params.input.dateFrom,
      dateTo: params.input.dateTo,
    },
  );

  if (!snapshot) {
    throw new AppError(
      "MANAGER_PROPERTY_REPORT_NOT_FOUND",
      "Property report details could not be found.",
      404,
    );
  }

  const documentNumber = createDocumentNumber({
    documentType: "property_report",
    landlordClientId: snapshot.landlord.id,
    propertyId: snapshot.property.id,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
  });
  const fileName = createFileName({
    documentType: "property_report",
    documentNumber,
  });
  const storagePath = createStoragePath({
    organizationId: organization.id,
    landlordClientId: snapshot.landlord.id,
    propertyId: snapshot.property.id,
    documentType: "property_report",
    fileName,
  });
  const idempotencyKey = createIdempotencyKey({
    organizationId: organization.id,
    landlordClientId: snapshot.landlord.id,
    propertyId: snapshot.property.id,
    documentType: "property_report",
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
  });
  const fileBuffer = await renderPropertyDocumentBuffer({
    documentNumber,
    snapshot,
  });

  await uploadPdf({
    storagePath,
    fileBuffer,
  });

  return upsertManagerStatementDocument(adminSupabase, {
    organizationId: organization.id,
    landlordClientId: snapshot.landlord.id,
    propertyId: snapshot.property.id,
    documentType: "property_report",
    idempotencyKey,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
    documentNumber,
    storagePath,
    fileName,
    generatedByProfileId: params.managerProfileId,
    metadata: {
      source: "bopa_manager_property_report_generation",
      document_type: "property_report",
      landlord_name: snapshot.landlord.name,
      property_name: snapshot.property.name,
      manager_company_name: snapshot.organization.name,
      date_from: params.input.dateFrom,
      date_to: params.input.dateTo,
      total_received: snapshot.totals.totalReceived,
      landlord_share: snapshot.totals.landlordShare,
      manager_commission:
        snapshot.totals.managerCommission,
      outstanding_rent:
        snapshot.tenantPosition.outstandingBalance,
      open_maintenance_count:
        snapshot.totals.openMaintenanceCount,
      powered_by: "BOPA - Boldverse Property App",
    },
  });
}

export async function getManagerStatementDocumentDownload(
  params: {
    managerProfileId: string;
    documentType:
      | "landlord_statement"
      | "remittance_summary";
    input: ManagerStatementDocumentQueryInput;
  },
): Promise<ManagerStatementDownload> {
  const document =
    await generateManagerStatementDocument(params);
  const fileBuffer = await downloadPdf(
    document.storage_path,
  );

  return {
    fileName: document.file_name,
    fileBuffer,
  };
}

export async function getManagerPropertyReportDownload(
  params: {
    managerProfileId: string;
    input: ManagerPropertyReportQueryInput;
  },
): Promise<ManagerStatementDownload> {
  const document =
    await generateManagerPropertyReportDocument(params);
  const fileBuffer = await downloadPdf(
    document.storage_path,
  );

  return {
    fileName: document.file_name,
    fileBuffer,
  };
}

export async function getManagerStatementWhatsAppLink(
  params: {
    managerProfileId: string;
    documentType:
      | "landlord_statement"
      | "remittance_summary";
    input: ManagerStatementDocumentQueryInput;
  },
): Promise<ManagerStatementShareLink> {
  const organization = await requireManagerStatementAccess(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const snapshot =
    await getManagerLandlordStatementSnapshot(adminSupabase, {
      organizationId: organization.id,
      landlordClientId: params.input.landlordClientId,
      dateFrom: params.input.dateFrom,
      dateTo: params.input.dateTo,
    });

  if (!snapshot) {
    throw new AppError(
      "MANAGER_STATEMENT_NOT_FOUND",
      "Statement details could not be found.",
      404,
    );
  }

  const document =
    await generateManagerStatementDocument(params);
  const privateShareUrl =
    await createPrivateManagerDocumentShareUrl({
      document,
      createdByProfileId: params.managerProfileId,
    });
  const phoneNumber = normalizeWhatsAppPhone(
    snapshot.landlord.phone,
  );

  if (!phoneNumber) {
    throw new AppError(
      "MANAGER_LANDLORD_PHONE_MISSING",
      "Landlord phone number is missing.",
      400,
    );
  }

  const label =
    params.documentType === "landlord_statement"
      ? "landlord statement"
      : "remittance summary";

  const message = [
    `Hello ${snapshot.landlord.name},`,
    "",
    `Your ${label} from ${snapshot.organization.name} is ready.`,
    "",
    `Document number: ${document.document_number}`,
    `Amount remitted: ${formatMoney(
      snapshot.totals.amountRemitted,
    )}`,
    `Balance due: ${formatMoney(
      snapshot.totals.pendingLandlordBalance,
    )}`,
    "",
    "This private report link expires in 72 hours:",
    privateShareUrl,
  ].join("\n");

  return {
    whatsappUrl: buildWhatsAppUrl({
      phoneNumber,
      message,
    }),
  };
}

export async function getManagerPropertyReportWhatsAppLink(
  params: {
    managerProfileId: string;
    input: ManagerPropertyReportQueryInput;
  },
): Promise<ManagerStatementShareLink> {
  const organization = await requireManagerStatementAccess(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const snapshot = await getManagerPropertyReportSnapshot(
    adminSupabase,
    {
      organizationId: organization.id,
      propertyId: params.input.propertyId,
      dateFrom: params.input.dateFrom,
      dateTo: params.input.dateTo,
    },
  );

  if (!snapshot) {
    throw new AppError(
      "MANAGER_PROPERTY_REPORT_NOT_FOUND",
      "Property report details could not be found.",
      404,
    );
  }

  const document =
    await generateManagerPropertyReportDocument(params);
  const privateShareUrl =
    await createPrivateManagerDocumentShareUrl({
      document,
      createdByProfileId: params.managerProfileId,
    });
  const phoneNumber = normalizeWhatsAppPhone(
    snapshot.landlord.phone,
  );

  if (!phoneNumber) {
    throw new AppError(
      "MANAGER_LANDLORD_PHONE_MISSING",
      "Landlord phone number is missing.",
      400,
    );
  }

  const message = [
    `Hello ${snapshot.landlord.name},`,
    "",
    `${snapshot.organization.name} has prepared the property report for ${snapshot.property.name}.`,
    "",
    `Total received: ${formatMoney(
      snapshot.totals.totalReceived,
    )}`,
    `Outstanding rent: ${formatMoney(
      snapshot.tenantPosition.outstandingBalance,
    )}`,
    `Open maintenance issues: ${snapshot.totals.openMaintenanceCount}`,
    "",
    "This private report link expires in 72 hours:",
    privateShareUrl,
  ].join("\n");

  return {
    whatsappUrl: buildWhatsAppUrl({
      phoneNumber,
      message,
    }),
  };
}

async function requireStoredStatementDocument(params: {
  managerProfileId: string;
  documentId: string;
}) {
  const organization = await requireManagerStatementAccess(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const document = await getManagerStatementDocumentById(
    adminSupabase,
    {
      organizationId: organization.id,
      documentId: params.documentId,
    },
  );

  if (!document) {
    throw new AppError(
      "MANAGER_STATEMENT_DOCUMENT_NOT_FOUND",
      "The selected report could not be found.",
      404,
    );
  }

  return {
    organization,
    adminSupabase,
    document,
  };
}

async function getStoredDocumentShareContext(params: {
  organizationId: string;
  landlordClientId: string;
  propertyId: string | null;
}) {
  const adminSupabase = createSupabaseAdminClient();

  const [landlordResult, propertyResult] = await Promise.all([
    adminSupabase
      .from("manager_landlord_clients")
      .select("id, landlord_name, landlord_phone")
      .eq("organization_id", params.organizationId)
      .eq("id", params.landlordClientId)
      .maybeSingle<{
        id: string;
        landlord_name: string;
        landlord_phone: string | null;
      }>(),
    params.propertyId
      ? adminSupabase
          .from("manager_properties")
          .select("id, property_name")
          .eq("organization_id", params.organizationId)
          .eq("id", params.propertyId)
          .maybeSingle<{
            id: string;
            property_name: string;
          }>()
      : Promise.resolve({
          data: null,
          error: null,
        }),
  ]);

  if (landlordResult.error) {
    throw landlordResult.error;
  }

  if (propertyResult.error) {
    throw propertyResult.error;
  }

  if (!landlordResult.data) {
    throw new AppError(
      "MANAGER_LANDLORD_NOT_FOUND",
      "The landlord for this report could not be found.",
      404,
    );
  }

  return {
    landlord: landlordResult.data,
    property: propertyResult.data,
  };
}

function getStoredDocumentLabel(
  documentType: ManagerStatementDocumentType,
) {
  if (documentType === "property_report") {
    return "property report";
  }

  if (documentType === "remittance_summary") {
    return "remittance summary";
  }

  return "landlord statement";
}

function formatStoredDocumentPeriod(params: {
  dateFrom: string | null;
  dateTo: string | null;
}) {
  if (!params.dateFrom && !params.dateTo) {
    return "All available records";
  }

  const formatDate = (value: string | null) => {
    if (!value) {
      return "Start";
    }

    return new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Lagos",
    }).format(new Date(`${value}T00:00:00Z`));
  };

  return `${formatDate(params.dateFrom)} to ${formatDate(
    params.dateTo,
  )}`;
}

export async function getManagerStoredStatementDocumentDownload(
  params: {
    managerProfileId: string;
    documentId: string;
  },
): Promise<ManagerStatementDownload> {
  const { document } = await requireStoredStatementDocument(params);
  const fileBuffer = await downloadPdf(document.storage_path);

  return {
    fileName: document.file_name,
    fileBuffer,
  };
}

export async function getManagerStoredStatementDocumentWhatsAppLink(
  params: {
    managerProfileId: string;
    documentId: string;
  },
): Promise<ManagerStatementShareLink> {
  const { organization, document } =
    await requireStoredStatementDocument(params);

  const context = await getStoredDocumentShareContext({
    organizationId: organization.id,
    landlordClientId: document.landlord_client_id,
    propertyId: document.property_id,
  });

  const phoneNumber = normalizeWhatsAppPhone(
    context.landlord.landlord_phone,
  );

  if (!phoneNumber) {
    throw new AppError(
      "MANAGER_LANDLORD_PHONE_MISSING",
      "Landlord phone number is missing.",
      400,
    );
  }

  const privateShareUrl =
    await createPrivateManagerDocumentShareUrl({
      document,
      createdByProfileId: params.managerProfileId,
    });
  const label = getStoredDocumentLabel(document.document_type);
  const subject =
    document.document_type === "property_report" &&
    context.property
      ? `${label} for ${context.property.property_name}`
      : label;

  const message = [
    `Hello ${context.landlord.landlord_name},`,
    "",
    `${organization.organization_name} has shared your ${subject}.`,
    "",
    `Document number: ${document.document_number}`,
    `Period: ${formatStoredDocumentPeriod({
      dateFrom: document.date_from,
      dateTo: document.date_to,
    })}`,
    "",
    "This private report link expires in 72 hours:",
    privateShareUrl,
  ].join("\n");

  return {
    whatsappUrl: buildWhatsAppUrl({
      phoneNumber,
      message,
    }),
  };
}
