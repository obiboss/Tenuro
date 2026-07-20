import "server-only";

import { Resend } from "resend";
import type { DemoRequestRow } from "@/server/repositories/demo-requests.repository";

export type DemoRequestEmailResult =
  | {
      status: "sent";
      providerId: string | null;
    }
  | {
      status: "failed";
      errorMessage: string;
    }
  | {
      status: "not_configured";
    };

const TIME_WINDOW_LABELS = {
  morning: "Morning (9:00 AM–12:00 PM WAT)",
  afternoon: "Afternoon (12:00 PM–4:00 PM WAT)",
  evening: "Evening (4:00 PM–6:00 PM WAT)",
} as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPreferredDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "full",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${value}T12:00:00+01:00`));
}

function getNotificationConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.DEMO_NOTIFICATION_FROM_EMAIL?.trim();
  const to = process.env.DEMO_NOTIFICATION_TO_EMAIL?.trim();

  if (!apiKey || !from || !to) {
    return null;
  }

  return {
    apiKey,
    from,
    to,
  };
}

function buildTextEmail(request: DemoRequestRow) {
  return [
    `New BOPA ${request.workspace_type === "manager" ? "Manager" : "Developer"} demo request`,
    "",
    `Name: ${request.full_name}`,
    `Company: ${request.company_name}`,
    `Email: ${request.work_email}`,
    `Phone: ${request.phone_number}`,
    `Preferred date: ${formatPreferredDate(request.preferred_date)}`,
    `Preferred time: ${TIME_WINDOW_LABELS[request.preferred_time_window]}`,
    `Additional information: ${request.message || "None provided"}`,
    "",
    `Request reference: ${request.id}`,
    "Open BOPA Admin to contact the requester and update the request.",
  ].join("\n");
}

function buildHtmlEmail(request: DemoRequestRow) {
  const workspaceLabel =
    request.workspace_type === "manager" ? "Manager" : "Developer";
  const rows = [
    ["Name", request.full_name],
    ["Company", request.company_name],
    ["Email", request.work_email],
    ["Phone", request.phone_number],
    ["Preferred date", formatPreferredDate(request.preferred_date)],
    ["Preferred time", TIME_WINDOW_LABELS[request.preferred_time_window]],
    ["Additional information", request.message || "None provided"],
  ];

  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;font-weight:700;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#18212f;max-width:680px;margin:0 auto;">
      <h1 style="font-size:24px;margin-bottom:8px;">New BOPA ${workspaceLabel} demo request</h1>
      <p style="margin-top:0;color:#596579;">A prospective customer has requested a live demonstration.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;border:1px solid #e8e8e8;">
        ${detailRows}
      </table>
      <p><strong>Request reference:</strong> ${escapeHtml(request.id)}</p>
      <p>Open BOPA Admin to contact the requester and update the request.</p>
    </div>`;
}

export async function sendDemoRequestNotification(
  request: DemoRequestRow,
): Promise<DemoRequestEmailResult> {
  const configuration = getNotificationConfiguration();

  if (!configuration) {
    return {
      status: "not_configured",
    };
  }

  try {
    const resend = new Resend(configuration.apiKey);
    const workspaceLabel =
      request.workspace_type === "manager" ? "Manager" : "Developer";
    const { data, error } = await resend.emails.send({
      from: configuration.from,
      to: [configuration.to],
      replyTo: request.work_email,
      subject: `New BOPA ${workspaceLabel} demo request`,
      text: buildTextEmail(request),
      html: buildHtmlEmail(request),
    });

    if (error) {
      return {
        status: "failed",
        errorMessage: error.message,
      };
    }

    return {
      status: "sent",
      providerId: data?.id ?? null,
    };
  } catch (error) {
    return {
      status: "failed",
      errorMessage:
        error instanceof Error
          ? error.message
          : "The demo request notification could not be sent.",
    };
  }
}
