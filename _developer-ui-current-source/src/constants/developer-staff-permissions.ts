export const DEVELOPER_STAFF_TITLES = [
  "sales_rep",
  "marketing_staff",
  "document_officer",
  "accountant",
] as const;

export type DeveloperStaffTitle = (typeof DEVELOPER_STAFF_TITLES)[number];

export const DEVELOPER_STAFF_PERMISSION_KEYS = [
  "buyer:create",
  "inspection:book",
  "payment_request:create",
  "installment:follow_up",
  "payment:view",
  "buyer_document_copy:upload",
  "buyer_document_status:update",
  "receipt:view_share",
] as const;

export type DeveloperStaffPermissionKey =
  (typeof DEVELOPER_STAFF_PERMISSION_KEYS)[number];

export const DEVELOPER_STAFF_TITLE_OPTIONS: readonly {
  value: DeveloperStaffTitle;
  label: string;
  description: string;
}[] = [
  {
    value: "sales_rep",
    label: "Sales Rep",
    description:
      "Can create buyer leads, book inspections, send approved payment links, and follow up installments.",
  },
  {
    value: "marketing_staff",
    label: "Marketing Staff",
    description:
      "Can create buyer leads and book inspections from campaigns or site visits.",
  },
  {
    value: "document_officer",
    label: "Document Officer",
    description:
      "Can upload digital document copies and update document handover status.",
  },
  {
    value: "accountant",
    label: "Accountant",
    description:
      "Can view payments, send approved payment requests, follow up installments, and share receipts.",
  },
];

export const DEVELOPER_STAFF_PERMISSION_OPTIONS: readonly {
  key: DeveloperStaffPermissionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "buyer:create",
    label: "Create buyer records",
    description: "Add buyer leads and buyer details under the company.",
  },
  {
    key: "inspection:book",
    label: "Book inspection",
    description: "Schedule site, office, or farm inspection visits.",
  },
  {
    key: "payment_request:create",
    label: "Send payment request",
    description: "Send approved payment links to buyers.",
  },
  {
    key: "installment:follow_up",
    label: "Follow up installment",
    description: "Track and follow up outstanding buyer installments.",
  },
  {
    key: "payment:view",
    label: "View payments",
    description: "View payment status and payment history.",
  },
  {
    key: "buyer_document_copy:upload",
    label: "Upload document copies",
    description:
      "Upload digital copies of buyer documents. Originals remain physical records.",
  },
  {
    key: "buyer_document_status:update",
    label: "Update document status",
    description:
      "Mark document copies as uploaded, prepared, issued, or collected.",
  },
  {
    key: "receipt:view_share",
    label: "View and share receipts",
    description:
      "View and share BOPA-generated receipts from verified payments.",
  },
];

export const DEVELOPER_STAFF_TITLE_PERMISSION_PRESETS: Record<
  DeveloperStaffTitle,
  readonly DeveloperStaffPermissionKey[]
> = {
  sales_rep: [
    "buyer:create",
    "inspection:book",
    "payment_request:create",
    "installment:follow_up",
    "receipt:view_share",
  ],
  marketing_staff: ["buyer:create", "inspection:book"],
  document_officer: [
    "buyer_document_copy:upload",
    "buyer_document_status:update",
    "receipt:view_share",
  ],
  accountant: [
    "payment:view",
    "payment_request:create",
    "installment:follow_up",
    "receipt:view_share",
  ],
};

export function getDeveloperStaffTitleLabel(title: DeveloperStaffTitle) {
  return (
    DEVELOPER_STAFF_TITLE_OPTIONS.find((option) => option.value === title)
      ?.label ?? "Staff"
  );
}

export function getDeveloperStaffPermissionLabel(
  permission: DeveloperStaffPermissionKey,
) {
  return (
    DEVELOPER_STAFF_PERMISSION_OPTIONS.find(
      (option) => option.key === permission,
    )?.label ?? permission
  );
}

export function isDeveloperStaffPermissionKey(
  value: string,
): value is DeveloperStaffPermissionKey {
  return DEVELOPER_STAFF_PERMISSION_KEYS.includes(
    value as DeveloperStaffPermissionKey,
  );
}
