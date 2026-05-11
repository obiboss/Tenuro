export type PublicAgreementGeneratorActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  agreement?: {
    leadId: string;
    agreementId: string;
    agreementTitle: string;
    landlordFullName: string;
    tenantFullName: string;
    propertyLabel: string;
    rentAmount: number;
    cautionDepositAmount: number;
    tenancyStartDate: string;
    tenancyEndDate: string;
    tenancyDurationMonths: number;
    paymentFrequency: string;
    watermarkText: string;
  };
};

export const initialPublicAgreementGeneratorState: PublicAgreementGeneratorActionState =
  {
    ok: false,
    message: "",
  };
