export function buildDeveloperBuyerPurchaseWhatsappMessage(params: {
  buyerName: string;
  companyName: string;
  purchaseUrl: string;
}) {
  const buyerName = params.buyerName.trim() || "there";

  return [
    `Good day ${buyerName}.`,
    `Your property purchase link from ${params.companyName} is ready.`,
    `Please complete your details and continue here: ${params.purchaseUrl}`,
    "Sent with BOPA.",
  ].join(" ");
}

export function buildDeveloperBuyerPortalWhatsappMessage(params: {
  buyerName: string;
  estatePlotLabel: string;
  portalUrl: string;
}) {
  const buyerName = params.buyerName.trim() || "there";

  return [
    `Good day ${buyerName}.`,
    `Your buyer portal for ${params.estatePlotLabel} is ready.`,
    `You can view your payment history, receipts, balance, and documents here: ${params.portalUrl}`,
    "Sent with BOPA.",
  ].join(" ");
}

export function buildDeveloperPaymentReminderWhatsappMessage(params: {
  buyerName: string;
  estatePlotLabel: string;
  amount: string;
  dueDate: string;
  companyName: string;
}) {
  const buyerName = params.buyerName.trim() || "there";

  return [
    `Good day ${buyerName}.`,
    `This is a payment reminder for ${params.estatePlotLabel}.`,
    `Amount due: ${params.amount}.`,
    `Due date: ${params.dueDate}.`,
    `Please pay or contact ${params.companyName}.`,
    "Sent with BOPA.",
  ].join(" ");
}

export function buildTenantContactWhatsappMessage(params: {
  tenantName: string;
  propertyUnitLabel: string;
}) {
  return [
    `Good day ${params.tenantName}.`,
    `This is a message from your landlord about ${params.propertyUnitLabel} on BOPA.`,
    "Please reply when you can.",
  ].join(" ");
}
