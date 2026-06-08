import "server-only";

export type DeveloperInstallmentFeeTier = {
  minAmount: number;
  maxAmount: number | null;
  percentage: number;
};

export const DEVELOPER_INSTALLMENT_FEE_TIERS: readonly DeveloperInstallmentFeeTier[] =
  [
    {
      minAmount: 0,
      maxAmount: 500_000,
      percentage: 1.5,
    },
    {
      minAmount: 500_000.01,
      maxAmount: 2_000_000,
      percentage: 1,
    },
    {
      minAmount: 2_000_000.01,
      maxAmount: 5_000_000,
      percentage: 0.75,
    },
    {
      minAmount: 5_000_000.01,
      maxAmount: null,
      percentage: 0.5,
    },
  ];

export function getDeveloperInstallmentFeePercentage(amount: number) {
  const tier = DEVELOPER_INSTALLMENT_FEE_TIERS.find((item) => {
    const meetsMinimum = amount >= item.minAmount;
    const meetsMaximum = item.maxAmount === null || amount <= item.maxAmount;

    return meetsMinimum && meetsMaximum;
  });

  return tier?.percentage ?? 0.5;
}

export function calculateDeveloperInstallmentFee(amount: number) {
  const percentage = getDeveloperInstallmentFeePercentage(amount);
  const feeAmount = Number(((amount * percentage) / 100).toFixed(2));

  return {
    percentage,
    feeAmount,
  };
}
