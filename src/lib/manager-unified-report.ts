import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
} from "@/server/repositories/manager.repository";

export type ManagerUnifiedReportRentPosition = {
  tenantId: string;
  tenantName: string;
  unitLabel: string;
  rentAmount: number;
  status: "paid_up" | "due_soon" | "owing";
  statusLabel: string;
  nextDueDate: string | null;
  balance: number;
};

export type ManagerUnifiedReportExpense = {
  id: string;
  title: string;
  date: string;
  amount: number;
  status: string;
  vendorName: string | null;
};

export type ManagerUnifiedReportPayment = {
  id: string;
  tenantName: string;
  unitLabel: string;
  paymentDate: string;
  amountPaid: number;
  managerCommission: number;
  landlordNetAmount: number;
  paymentMethod: string;
  source: "Via app" | "Manual";
};

export type ManagerUnifiedReportRemittance = {
  id: string;
  remittanceDate: string;
  amountRemitted: number;
  paymentMethod: string;
  paymentReference: string | null;
};

export type ManagerUnifiedPropertyReportSnapshot = {
  organization: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  landlord: ManagerLandlordClientRow;
  property: ManagerPropertyRow;
  period: {
    dateFrom: string;
    dateTo: string;
  };
  totals: {
    rentCollected: number;
    managerCommission: number;
    maintenanceAndExpenses: number;
    grossLandlordShare: number;
    amountDueToLandlord: number;
    amountRemitted: number;
    pendingLandlordBalance: number;
    unallocatedLandlordRemittances: number;
  };
  occupancy: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
    tenantsOwing: number;
    tenantsDueSoon: number;
  };
  rentPositions: ManagerUnifiedReportRentPosition[];
  expenses: ManagerUnifiedReportExpense[];
  payments: ManagerUnifiedReportPayment[];
  remittances: ManagerUnifiedReportRemittance[];
};

export type ManagerUnifiedReportData = {
  landlordOptions: ManagerLandlordClientRow[];
  propertyOptions: ManagerPropertyRow[];
  snapshot: ManagerUnifiedPropertyReportSnapshot | null;
};
