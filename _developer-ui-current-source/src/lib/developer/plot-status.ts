import type { DeveloperPlotStatus } from "@/server/repositories/developer-plots.repository";

export type PlotStatusFilter =
  | "all"
  | "available"
  | "reserved"
  | "sold"
  | "blocked";

export function getPlotStatusLabel(status: DeveloperPlotStatus) {
  if (status === "available") {
    return "Available";
  }

  if (status === "reserved") {
    return "Reserved";
  }

  if (status === "active") {
    return "Sale active";
  }

  if (status === "sold") {
    return "Sold";
  }

  return "Blocked";
}

export function getPlotStatusTone(status: DeveloperPlotStatus) {
  if (status === "available") {
    return "success" as const;
  }

  if (status === "blocked") {
    return "warning" as const;
  }

  return "primary" as const;
}

export function isPlotLockedForBulkUpdate(status: DeveloperPlotStatus) {
  return status === "reserved" || status === "active" || status === "sold";
}

export function matchesPlotStatusFilter(
  status: DeveloperPlotStatus,
  filter: PlotStatusFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "available") {
    return status === "available";
  }

  if (filter === "reserved") {
    return status === "reserved";
  }

  if (filter === "sold") {
    return status === "sold" || status === "active";
  }

  return status === "blocked";
}
