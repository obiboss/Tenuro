import type {
  ManagerCollectionMode,
  ManagerManagementFeeType,
  ManagerPaymentReceiver,
  ManagerRemittanceStatus,
  ManagerRentPaymentStatus,
} from "@/constants/manager";

export type ManagerPaymentBreakdown = {
  amountPaid: number;
  managerCommission: number;
  landlordShare: number;
  bopaPlatformFee: number;
  paystackCharge: number;
};

export type ManagerTenantRentSignal =
  | {
      kind: "owing";
      label: "Owing";
    }
  | {
      kind: "due_soon";
      label: string;
      daysUntilDue: number;
    }
  | null;

export type ManagerStatementPaymentInput = {
  status: ManagerRentPaymentStatus;
  amountPaid: number;
  managerCommission: number;
  landlordShare: number;
};

export type ManagerStatementRemittanceInput = {
  status: ManagerRemittanceStatus;
  amountRemitted: number;
};

export type ManagerStatementTotals = {
  totalRentRecorded: number;
  managerCommission: number;
  amountDueToLandlord: number;
  amountRemitted: number;
  pendingLandlordBalance: number;
  pendingConfirmationAmount: number;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateBopaPlatformFeePlaceholder() {
  return 0;
}

export function calculatePaystackChargePlaceholder() {
  return 0;
}

export function calculateManagerPaymentBreakdown(params: {
  amountPaid: number;
  managementFeeType: ManagerManagementFeeType;
  managementFeeValue: number;
}): ManagerPaymentBreakdown {
  const amountPaid = roundMoney(Math.max(0, params.amountPaid));
  const bopaPlatformFee = calculateBopaPlatformFeePlaceholder();
  const paystackCharge = calculatePaystackChargePlaceholder();

  const managerCommission =
    params.managementFeeType === "percentage"
      ? roundMoney((amountPaid * params.managementFeeValue) / 100)
      : roundMoney(Math.min(params.managementFeeValue, amountPaid));

  const landlordShare = roundMoney(
    amountPaid - managerCommission - bopaPlatformFee - paystackCharge,
  );

  return {
    amountPaid,
    managerCommission,
    landlordShare: Math.max(0, landlordShare),
    bopaPlatformFee,
    paystackCharge,
  };
}

export function deriveManualManagerPaymentStatus(params: {
  collectionMode: ManagerCollectionMode;
  paymentReceiver: ManagerPaymentReceiver;
}): ManagerRentPaymentStatus {
  if (
    params.collectionMode === "manager_collects" &&
    params.paymentReceiver === "manager"
  ) {
    return "recorded";
  }

  return "pending_confirmation";
}

export function isTenantBalanceAffectingPaymentStatus(
  status: ManagerRentPaymentStatus,
) {
  return status === "recorded" || status === "verified";
}

export function calculateTenantBalanceAfterPayment(params: {
  currentBalance: number;
  amountPaid: number;
  paymentStatus: ManagerRentPaymentStatus;
}) {
  if (!isTenantBalanceAffectingPaymentStatus(params.paymentStatus)) {
    return roundMoney(Math.max(0, params.currentBalance));
  }

  return roundMoney(Math.max(0, params.currentBalance - params.amountPaid));
}

export function calculateTenantRentSignal(params: {
  currentBalance: number;
  nextRentDueDate: string | null;
  today?: Date;
}): ManagerTenantRentSignal {
  if (Number(params.currentBalance) > 0) {
    return {
      kind: "owing",
      label: "Owing",
    };
  }

  if (!params.nextRentDueDate) {
    return null;
  }

  const today = params.today ? new Date(params.today) : new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${params.nextRentDueDate}T00:00:00`);
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilDue >= 0 && daysUntilDue <= 30) {
    return {
      kind: "due_soon",
      label: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
      daysUntilDue,
    };
  }

  return null;
}

export function isReliableManagerRentPaymentStatus(
  status: ManagerRentPaymentStatus,
) {
  return status === "recorded" || status === "verified";
}

export function isVisibleManagerRentPaymentStatus(
  status: ManagerRentPaymentStatus,
) {
  return status !== "rejected" && status !== "reversed";
}

export function isReliableManagerRemittanceStatus(
  status: ManagerRemittanceStatus,
) {
  return status === "recorded" || status === "confirmed";
}

export function calculateLandlordStatementTotals(params: {
  payments: ManagerStatementPaymentInput[];
  remittances: ManagerStatementRemittanceInput[];
}): ManagerStatementTotals {
  const visiblePayments = params.payments.filter((payment) =>
    isVisibleManagerRentPaymentStatus(payment.status),
  );

  const reliablePayments = params.payments.filter((payment) =>
    isReliableManagerRentPaymentStatus(payment.status),
  );

  const reliableRemittances = params.remittances.filter((remittance) =>
    isReliableManagerRemittanceStatus(remittance.status),
  );

  const totalRentRecorded = visiblePayments.reduce(
    (total, payment) => total + Number(payment.amountPaid),
    0,
  );

  const managerCommission = reliablePayments.reduce(
    (total, payment) => total + Number(payment.managerCommission),
    0,
  );

  const amountDueToLandlord = reliablePayments.reduce(
    (total, payment) => total + Number(payment.landlordShare),
    0,
  );

  const amountRemitted = reliableRemittances.reduce(
    (total, remittance) => total + Number(remittance.amountRemitted),
    0,
  );

  const pendingConfirmationAmount = params.payments
    .filter((payment) => payment.status === "pending_confirmation")
    .reduce((total, payment) => total + Number(payment.landlordShare), 0);

  return {
    totalRentRecorded: roundMoney(totalRentRecorded),
    managerCommission: roundMoney(managerCommission),
    amountDueToLandlord: roundMoney(amountDueToLandlord),
    amountRemitted: roundMoney(amountRemitted),
    pendingLandlordBalance: roundMoney(
      Math.max(0, amountDueToLandlord - amountRemitted),
    ),
    pendingConfirmationAmount: roundMoney(pendingConfirmationAmount),
  };
}

export function calculateLandlordRemittancePosition(params: {
  payments: ManagerStatementPaymentInput[];
  remittances: ManagerStatementRemittanceInput[];
}) {
  const totals = calculateLandlordStatementTotals(params);

  return {
    amountDueToLandlord: totals.amountDueToLandlord,
    amountRemitted: totals.amountRemitted,
    pendingBalance: totals.pendingLandlordBalance,
  };
}

export function calculateManagerReceiptTotals(params: {
  amountPaid: number;
  tenantBalanceBeforePayment: number;
  paymentStatus: ManagerRentPaymentStatus;
}) {
  const balanceAfterPayment = calculateTenantBalanceAfterPayment({
    currentBalance: params.tenantBalanceBeforePayment,
    amountPaid: params.amountPaid,
    paymentStatus: params.paymentStatus,
  });

  return {
    amountPaid: roundMoney(params.amountPaid),
    previousBalance: roundMoney(params.tenantBalanceBeforePayment),
    balanceAfterPayment,
  };
}
