import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";

export type PlotGroup = {
  id: string;
  label: string;
  plots: DeveloperPlotRow[];
};

const PLOT_RANGE_GROUP_SIZE = 50;

function getNumericPlotGroupLabel(plotNumber: string) {
  const numericMatch = plotNumber.match(/^Plot\s+(\d+)$/i);

  if (!numericMatch) {
    return null;
  }

  const plotIndex = Number(numericMatch[1]);
  const rangeStart =
    Math.floor((plotIndex - 1) / PLOT_RANGE_GROUP_SIZE) *
      PLOT_RANGE_GROUP_SIZE +
    1;
  const rangeEnd = rangeStart + PLOT_RANGE_GROUP_SIZE - 1;

  return `Plot ${rangeStart}–${rangeEnd}`;
}

export function getPlotGroupLabel(plotNumber: string) {
  const blockMatch = plotNumber.match(/^Block\s+([A-Za-z]+)/i);

  if (blockMatch) {
    return `Block ${blockMatch[1].toUpperCase()}`;
  }

  const prefixedNumericMatch = plotNumber.match(/^([A-Za-z]+)\d+$/);

  if (prefixedNumericMatch) {
    return `Block ${prefixedNumericMatch[1].toUpperCase()}`;
  }

  const numericGroupLabel = getNumericPlotGroupLabel(plotNumber);

  if (numericGroupLabel) {
    return numericGroupLabel;
  }

  return "Other plots";
}

export function groupDeveloperPlots(plots: DeveloperPlotRow[]) {
  const groups = new Map<string, PlotGroup>();

  for (const plot of plots) {
    const label = getPlotGroupLabel(plot.plot_number);

    if (!groups.has(label)) {
      groups.set(label, {
        id: label,
        label,
        plots: [],
      });
    }

    groups.get(label)?.plots.push(plot);
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function plotMatchesSearch(plot: DeveloperPlotRow, searchQuery: string) {
  const normalisedQuery = searchQuery.trim().toLowerCase();

  if (!normalisedQuery) {
    return true;
  }

  return plot.plot_number.toLowerCase().includes(normalisedQuery);
}
