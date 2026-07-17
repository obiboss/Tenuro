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
  if (!Number.isFinite(amount) || amount <= 0) {
    return DEVELOPER_INSTALLMENT_FEE_TIERS[0].percentage;
  }

  const tier = DEVELOPER_INSTALLMENT_FEE_TIERS.find((item) => {
    const meetsMinimum = amount >= item.minAmount;
    const meetsMaximum = item.maxAmount === null || amount <= item.maxAmount;

    return meetsMinimum && meetsMaximum;
  });

  return tier?.percentage ?? 0.5;
}

export function calculateDeveloperInstallmentFee(amount: number) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const percentage = getDeveloperInstallmentFeePercentage(safeAmount);
  const feeAmount = Number(((safeAmount * percentage) / 100).toFixed(2));

  return {
    percentage,
    feeAmount,
  };
}
