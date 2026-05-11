export type PublicReceiptGeneratorActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  receipt?: {
    leadId: string;
    receiptId: string;
    receiptNumber: string;
    landlordFullName: string;
    tenantFullName: string;
    propertyLabel: string;
    rentAmount: number;
    paymentDate: string;
    rentPeriodStart: string;
    rentPeriodEnd: string;
    rentDurationMonths: number;
    paymentMethod: string;
    whatsappMessage: string;
    watermarkText: string;
  };
};

export const initialPublicReceiptGeneratorState: PublicReceiptGeneratorActionState =
  {
    ok: false,
    message: "",
  };
