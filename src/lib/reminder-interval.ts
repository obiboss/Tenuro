import { format, isValid, parseISO, subDays } from "date-fns";
import { formatDisplayDate } from "@/lib/tenancy-period";

export const REMINDER_INTERVAL_OPTIONS = [
  { label: "30 days before renewal", value: 30 },
  { label: "60 days before renewal", value: 60 },
  { label: "90 days before renewal", value: 90 },
] as const;

export type ReminderIntervalDays =
  (typeof REMINDER_INTERVAL_OPTIONS)[number]["value"];

function parseDateInput(value: string) {
  const parsedDate = parseISO(value);

  if (!isValid(parsedDate)) {
    throw new Error("Invalid date value.");
  }

  return parsedDate;
}

export function computeReminderPreviewDate(
  endDate: string,
  intervalDays: ReminderIntervalDays,
) {
  const parsedEndDate = parseDateInput(endDate);

  return format(subDays(parsedEndDate, intervalDays), "yyyy-MM-dd");
}

export function formatReminderPreview(
  endDate: string,
  intervalDays: ReminderIntervalDays,
) {
  const previewDate = computeReminderPreviewDate(endDate, intervalDays);

  return `${formatDisplayDate(previewDate)} (${intervalDays} days before ${formatDisplayDate(endDate)})`;
}

export function computeRenewalNoticeDate(
  endDate: string,
  intervalDays: ReminderIntervalDays,
) {
  return computeReminderPreviewDate(endDate, intervalDays);
}
