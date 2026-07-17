import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
} from "@/server/repositories/manager.repository";
import type { ManagerStatementDocumentRow } from "@/server/repositories/manager-statement-documents.repository";

type Props = {
  documents: ManagerStatementDocumentRow[];
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
};

function getDocumentLabel(
  value: ManagerStatementDocumentRow["document_type"],
) {
  if (value === "property_report") {
    return "Property report";
  }

  if (value === "remittance_summary") {
    return "Remittance summary";
  }

  return "Landlord statement";
}

function getDocumentTone(
  value: ManagerStatementDocumentRow["document_type"],
) {
  if (value === "property_report") {
    return "bg-primary-soft text-primary";
  }

  if (value === "remittance_summary") {
    return "bg-success-soft text-success";
  }

  return "bg-surface text-text-muted";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatPeriod(document: ManagerStatementDocumentRow) {
  if (!document.date_from && !document.date_to) {
    return "All available records";
  }

  return `${formatDate(document.date_from) ?? "Start"} to ${
    formatDate(document.date_to) ?? "Today"
  }`;
}

export function ManagerReportDocumentHistory({
  documents,
  landlordClients,
  properties,
}: Props) {
  const landlordNameById = new Map(
    landlordClients.map((landlord) => [
      landlord.id,
      landlord.landlord_name,
    ]),
  );
  const propertyNameById = new Map(
    properties.map((property) => [
      property.id,
      property.property_name,
    ]),
  );

  return (
    <section className="rounded-card border border-border-soft bg-white shadow-sm">
      <div className="border-b border-border-soft p-4">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Recent generated reports
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Download an existing report again or create a fresh private
          WhatsApp link without rebuilding the document.
        </p>
      </div>

      {documents.length > 0 ? (
        <div className="divide-y divide-border-soft">
          {documents.map((document) => {
            const propertyName = document.property_id
              ? propertyNameById.get(document.property_id)
              : null;
            const landlordName =
              landlordNameById.get(
                document.landlord_client_id,
              ) ?? "Landlord";

            return (
              <article
                key={document.id}
                className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getDocumentTone(
                        document.document_type,
                      )}`}
                    >
                      {getDocumentLabel(document.document_type)}
                    </span>

                    <span className="text-xs font-black uppercase tracking-wide text-text-muted">
                      {document.document_number}
                    </span>
                  </div>

                  <p className="mt-3 truncate font-black text-text-strong">
                    {propertyName ?? landlordName}
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    {propertyName
                      ? `Landlord: ${landlordName} · `
                      : ""}
                    {formatPeriod(document)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-text-muted">
                    Generated {formatDateTime(document.generated_at)}
                  </p>
                </div>

                <div className="grid shrink-0 gap-2 sm:grid-cols-2">
                  <a
                    href={`/manager/reports/documents/${document.id}/download`}
                    className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                  >
                    Download
                  </a>

                  <a
                    href={`/manager/reports/documents/${document.id}/share`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                  >
                    Send to landlord
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-4">
          <div className="rounded-card bg-surface p-4">
            <p className="font-black text-text-strong">
              No generated report yet
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Prepare a property report or landlord statement above. It will
              appear here for future download and sharing.
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-border-soft p-4">
        <p className="text-sm font-semibold leading-6 text-text-muted">
          Each WhatsApp action replaces the previous link for that report
          and creates a new private link that expires after 72 hours.
        </p>
      </div>
    </section>
  );
}
