import "server-only";

export {
  DEVELOPER_INSTALLMENT_FEE_TIERS,
  calculateDeveloperInstallmentFee,
  getDeveloperInstallmentFeePercentage,
} from "@/constants/developer-installment-fees";

export type { DeveloperInstallmentFeeTier } from "@/constants/developer-installment-fees";
