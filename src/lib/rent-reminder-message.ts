import { formatNaira } from "@/lib/money/naira";
import { formatRentStatusLabel, getDaysUntilDueDate } from "@/lib/rent-status-labels";

function formatDueDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function getRentTimingPhrase(params: {
  outstandingBalance: number;
  dueDate: string | null;
  daysUntilDue: number | null;
}) {
  const daysUntilDue =
    params.daysUntilDue ?? getDaysUntilDueDate(params.dueDate) ?? null;

  if (params.outstandingBalance > 0) {
    if (daysUntilDue === null) {
      return "outstanding";
    }

    if (daysUntilDue < 0) {
      const overdueDays = Math.abs(daysUntilDue);

      if (overdueDays < 30) {
        return `overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
      }

      const totalMonths = Math.floor(overdueDays / 30);

      if (totalMonths < 12) {
        return `overdue by ${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
      }

      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;

      if (months === 0) {
        return `overdue by ${years} year${years === 1 ? "" : "s"}`;
      }

      return `overdue by ${years} year${years === 1 ? "" : "s"}, ${months} month${months === 1 ? "" : "s"}`;
    }

    if (daysUntilDue === 0) {
      return "due today";
    }

    const formattedDueDate = formatDueDate(params.dueDate);

    return formattedDueDate
      ? `due on ${formattedDueDate}`
      : `due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
  }

  if (daysUntilDue === 0) {
    return "due today";
  }

  if (daysUntilDue !== null && daysUntilDue > 0) {
    const formattedDueDate = formatDueDate(params.dueDate);

    return formattedDueDate
      ? `due on ${formattedDueDate}`
      : `due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
  }

  const formattedDueDate = formatDueDate(params.dueDate);

  return formattedDueDate ? `due on ${formattedDueDate}` : "due soon";
}

export function buildRentReminderWhatsappMessage(params: {
  tenantName: string;
  propertyUnitLabel: string;
  amount: number;
  outstandingBalance: number;
  dueDate: string | null;
  daysUntilDue?: number | null;
  landlordName: string;
  contactPhrase?: string;
}) {
  const timing = getRentTimingPhrase({
    outstandingBalance: params.outstandingBalance,
    dueDate: params.dueDate,
    daysUntilDue: params.daysUntilDue ?? null,
  });

  const contactLine = params.contactPhrase
    ? params.contactPhrase
    : `Please make payment or contact ${params.landlordName}.`;

  return [
    `Good day ${params.tenantName}.`,
    `This is a rent reminder for ${params.propertyUnitLabel}.`,
    `Your rent of ${formatNaira(params.amount)} is ${timing}.`,
    contactLine,
    "Sent with BOPA.",
  ].join(" ");
}

export function getPropertyUnitLabel(params: {
  propertyName?: string | null;
  unitIdentifier?: string | null;
}) {
  const propertyName = params.propertyName ?? "the property";
  const unitIdentifier = params.unitIdentifier ?? "the unit";

  return `${propertyName}, ${unitIdentifier}`;
}

export { formatRentStatusLabel };
