export const LAND_UNIT_OPTIONS = [
  {
    value: "sqm",
    label: "Square metres",
    shortLabel: "sqm",
  },
  {
    value: "hectare",
    label: "Hectares",
    shortLabel: "ha",
  },
  {
    value: "acre",
    label: "Acres",
    shortLabel: "ac",
  },
] as const;

export type LandSizeUnit = (typeof LAND_UNIT_OPTIONS)[number]["value"];

const SQUARE_METRES_PER_HECTARE = 10_000;
const SQUARE_METRES_PER_ACRE = 4_046.8564224;

export function convertLandSizeToSquareMetres(params: {
  value: number;
  unit: LandSizeUnit;
}) {
  if (!Number.isFinite(params.value) || params.value <= 0) {
    return 0;
  }

  if (params.unit === "hectare") {
    return Number((params.value * SQUARE_METRES_PER_HECTARE).toFixed(2));
  }

  if (params.unit === "acre") {
    return Number((params.value * SQUARE_METRES_PER_ACRE).toFixed(2));
  }

  return Number(params.value.toFixed(2));
}

export function calculateLandCapacity(params: {
  landSizeValue: number;
  landSizeUnit: LandSizeUnit;
  reservedLandPercentage: number;
  plotSizeSqm: number;
}) {
  const grossLandSizeSqm = convertLandSizeToSquareMetres({
    value: params.landSizeValue,
    unit: params.landSizeUnit,
  });

  const safeReservedPercentage = Math.min(
    Math.max(params.reservedLandPercentage, 0),
    99.99,
  );

  const reservedLandSizeSqm = Number(
    ((grossLandSizeSqm * safeReservedPercentage) / 100).toFixed(2),
  );

  const usableLandSizeSqm = Number(
    Math.max(0, grossLandSizeSqm - reservedLandSizeSqm).toFixed(2),
  );

  const maximumPlots =
    params.plotSizeSqm > 0
      ? Math.floor(usableLandSizeSqm / params.plotSizeSqm)
      : 0;

  return {
    grossLandSizeSqm,
    reservedLandSizeSqm,
    usableLandSizeSqm,
    maximumPlots,
  };
}

export function formatSquareMetres(value: number) {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 2,
  }).format(value);
}
