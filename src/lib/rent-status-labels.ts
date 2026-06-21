const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getDaysUntilDueDate(dueDate: string | null, today = startOfToday()) {
  if (!dueDate) {
    return null;
  }

  const due = new Date(`${dueDate}T00:00:00`);
  const differenceMs = due.getTime() - today.getTime();

  return Math.ceil(differenceMs / MS_PER_DAY);
}

function startOfToday() {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function formatOverdueDuration(overdueDays: number) {
  if (overdueDays < 30) {
    return `${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
  }

  const totalMonths = Math.floor(overdueDays / 30);

  if (totalMonths < 12) {
    return `${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (months === 0) {
    return `${years} year${years === 1 ? "" : "s"}`;
  }

  return `${years} year${years === 1 ? "" : "s"}, ${months} month${months === 1 ? "" : "s"}`;
}

export function formatRentStatusLabel(params: {
  outstandingBalance: number;
  dueDate: string | null;
  daysUntilDue?: number | null;
}) {
  const daysUntilDue =
    params.daysUntilDue ?? getDaysUntilDueDate(params.dueDate);

  if (params.outstandingBalance > 0) {
    if (daysUntilDue === null) {
      return "Owing";
    }

    if (daysUntilDue < 0) {
      const overdueDays = Math.abs(daysUntilDue);

      return `Owing · overdue by ${formatOverdueDuration(overdueDays)}`;
    }

    if (daysUntilDue === 0) {
      return "Due today";
    }

    return `Owing · due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
  }

  if (daysUntilDue === null) {
    return "Paid";
  }

  if (daysUntilDue === 0) {
    return "Due today";
  }

  if (daysUntilDue > 0) {
    return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
  }

  return "Paid";
}

export function isDueWithinDays(
  dueDate: string | null,
  days: number,
  today = startOfToday(),
) {
  const daysUntilDue = getDaysUntilDueDate(dueDate, today);

  return (
    daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= days
  );
}

export const DUE_SOON_DAYS = 30;
