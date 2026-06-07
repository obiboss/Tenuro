import "server-only";

import { AppError } from "@/server/errors/app-error";

export const RENT_COLLECTION_FEE_MODEL = "tiered_rent_collection" as const;

export type RentCollectionFeeTier = {
  minAnnualRentAmount: number;
  maxAnnualRentAmount: number | null;
  rate: number;
  ratePercentage: number;
  label: string;
};

export type RentCollectionFeeCalculation = {
  feeModel: typeof RENT_COLLECTION_FEE_MODEL;
  annualRentAmount: number;
  paymentAmount: number;
  rate: number;
  ratePercentage: number;
  feeAmount: number;
  totalAmount: number;
  tierLabel: string;
};

export const RENT_COLLECTION_FEE_TIERS: readonly RentCollectionFeeTier[] = [
  {
    minAnnualRentAmount: 0,
    maxAnnualRentAmount: 500_000,
    rate: 0.02,
    ratePercentage: 2,
    label: "up_to_500000",
  },
  {
    minAnnualRentAmount: 500_000.01,
    maxAnnualRentAmount: 1_500_000,
    rate: 0.015,
    ratePercentage: 1.5,
    label: "500001_to_1500000",
  },
  {
    minAnnualRentAmount: 1_500_000.01,
    maxAnnualRentAmount: 3_000_000,
    rate: 0.01,
    ratePercentage: 1,
    label: "1500001_to_3000000",
  },
  {
    minAnnualRentAmount: 3_000_000.01,
    maxAnnualRentAmount: null,
    rate: 0.0075,
    ratePercentage: 0.75,
    label: "above_3000000",
  },
];

function assertPositiveMoneyAmount(value: number, errorCode: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError(errorCode, "Payment amount is invalid.", 500);
  }
}

export function getRentCollectionFeeTier(
  annualRentAmount: number,
): RentCollectionFeeTier {
  assertPositiveMoneyAmount(
    annualRentAmount,
    "ANNUAL_RENT_AMOUNT_INVALID_FOR_FEE",
  );

  const tier = RENT_COLLECTION_FEE_TIERS.find((candidate) => {
    const isAboveMinimum = annualRentAmount >= candidate.minAnnualRentAmount;
    const isBelowMaximum =
      candidate.maxAnnualRentAmount === null ||
      annualRentAmount <= candidate.maxAnnualRentAmount;

    return isAboveMinimum && isBelowMaximum;
  });

  if (!tier) {
    throw new AppError(
      "RENT_COLLECTION_FEE_TIER_NOT_FOUND",
      "BOPA service fee could not be calculated.",
      500,
    );
  }

  return tier;
}

export function getRentCollectionFeeRate(annualRentAmount: number) {
  return getRentCollectionFeeTier(annualRentAmount).rate;
}

export function calculateRentCollectionFee(params: {
  annualRentAmount: number;
  paymentAmount: number;
}): RentCollectionFeeCalculation {
  assertPositiveMoneyAmount(
    params.annualRentAmount,
    "ANNUAL_RENT_AMOUNT_INVALID_FOR_FEE",
  );
  assertPositiveMoneyAmount(
    params.paymentAmount,
    "RENT_PAYMENT_AMOUNT_INVALID_FOR_FEE",
  );

  const tier = getRentCollectionFeeTier(params.annualRentAmount);
  const feeAmount = Math.round(params.paymentAmount * tier.rate);
  const totalAmount = params.paymentAmount + feeAmount;

  return {
    feeModel: RENT_COLLECTION_FEE_MODEL,
    annualRentAmount: params.annualRentAmount,
    paymentAmount: params.paymentAmount,
    rate: tier.rate,
    ratePercentage: tier.ratePercentage,
    feeAmount,
    totalAmount,
    tierLabel: tier.label,
  };
}
