export type PublicAgreementGeneratorActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  agreement?: {
    leadId: string;
    agreementId: string;
    title: string;
    landlordFullName: string;
    tenantFullName: string;
    propertyLabel: string;
    rentAmount: number;
    rentFrequency: string;
    tenancyStartDate: string;
    tenancyEndDate: string;
    tenancyDurationMonths: number;
    agreementBody: string;
    watermarkText: string;
  };
};

export const initialPublicAgreementGeneratorState: PublicAgreementGeneratorActionState =
  {
    ok: false,
    message: "",
  };
