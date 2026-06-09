import { NonRetriableError } from "inngest";
import { inngest } from "@/server/jobs/inngest.client";
import { generateDeveloperPaymentReceiptSystem } from "@/server/services/developer-payment-receipts.service";

type DeveloperPaymentReceiptRequestedEventData = {
  paymentId?: unknown;
};

export const generateDeveloperPaymentReceiptJob = inngest.createFunction(
  {
    id: "generate-developer-payment-receipt",
    name: "Generate developer payment receipt",
    triggers: {
      event: "developer/payment.receipt.requested",
    },
    retries: 3,
  },
  async ({ event, step }) => {
    const data = event.data as DeveloperPaymentReceiptRequestedEventData;
    const paymentId =
      typeof data.paymentId === "string" ? data.paymentId.trim() : "";

    if (!paymentId) {
      throw new NonRetriableError(
        "Developer payment receipt job requires paymentId.",
      );
    }

    return step.run(
      "generate-and-store-developer-payment-receipt",
      async () => {
        const receipt = await generateDeveloperPaymentReceiptSystem(paymentId);

        return {
          paymentId: receipt.payment.id,
          receiptNumber: receipt.payment.receipt_number,
          receiptPath: receipt.payment.receipt_path,
          receiptGenerated: receipt.payment.receipt_generated,
        };
      },
    );
  },
);

export const receiptJobs = [generateDeveloperPaymentReceiptJob];
