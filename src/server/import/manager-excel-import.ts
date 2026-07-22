import "server-only";

import { Readable } from "node:stream";
import ExcelJS, { type CellValue, type Worksheet } from "exceljs";
import { tryNormalisePhoneNumber } from "@/lib/phone";
import {
  managerImportRowSchema,
  type ManagerImportIssue,
  type ManagerImportRow,
} from "@/lib/manager-import";

const MAX_IMPORT_BYTES = 900 * 1024;
const MAX_IMPORT_ROWS = 500;
const MAX_PREVIEW_BYTES = 750_000;
const { Workbook } = ExcelJS;

const COLUMN_ALIASES = {
  landlordName: ["landlord name", "owner name", "landlord"],
  landlordPhone: ["landlord phone", "owner phone"],
  landlordEmail: ["landlord email", "owner email"],
  landlordAddress: ["landlord address", "owner address"],
  propertyName: ["property name", "building name", "property"],
  propertyAddress: ["property address", "building address", "address"],
  city: ["city", "town"],
  state: ["state"],
  lga: ["lga", "local government"],
  collectionMode: [
    "how rent is collected",
    "collection mode",
    "rent collection",
  ],
  managementFeeType: ["management fee type", "fee type"],
  managementFeeValue: ["management fee value", "management fee", "fee value"],
  paystackChargeBearer: [
    "transaction charge paid by",
    "paystack charge bearer",
  ],
  paymentReceiver: [
    "usual payment receiver",
    "payment receiver",
    "who receives rent",
  ],
  unitLabel: ["unit", "unit label", "apartment", "flat"],
  unitType: ["unit type", "apartment type", "flat type"],
  rentFrequency: ["rent frequency", "rent collection frequency", "payment frequency"],
  rentAmount: ["rent amount", "annual rent", "rent"],
  tenantName: ["tenant name", "tenant full name"],
  tenantPhone: ["tenant phone", "tenant phone number"],
  tenantEmail: ["tenant email"],
  occupation: ["occupation", "tenant occupation"],
  moveInDate: ["tenancy start date", "move in date", "rent cycle start"],
  nextRentDueDate: ["next rent due date", "next due date"],
  currentBalance: [
    "rent still owing",
    "current balance",
    "outstanding balance",
  ],
  lastPaymentAmount: ["last payment amount", "latest payment amount"],
  lastPaymentDate: ["last payment date", "latest payment date"],
  paymentMethod: ["payment method", "last payment method"],
  paymentReference: [
    "payment reference",
    "receipt reference",
    "bank reference",
  ],
} as const;

type ImportColumn = keyof typeof COLUMN_ALIASES;

function cleanHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function textValue(value: CellValue | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if ("text" in value) {
      return String(value.text).trim();
    }

    if ("result" in value) {
      return String(value.result ?? "").trim();
    }

    if ("richText" in value) {
      return value.richText
        .map((item) => item.text)
        .join("")
        .trim();
    }
  }

  return String(value).trim();
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberValue(value: string, fallback?: number) {
  const cleaned = value.replace(/[₦,\s]/g, "").trim();

  if (!cleaned && fallback !== undefined) {
    return fallback;
  }

  const result = Number(cleaned);
  return Number.isFinite(result) ? result : Number.NaN;
}

function dateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "invalid";
  }

  return parsed.toISOString().slice(0, 10);
}

function choiceValue<T extends string>(
  value: string,
  choices: Record<string, T>,
) {
  const key = cleanHeader(value);
  return choices[key] ?? value.trim().toLowerCase();
}

function buildColumnMap(worksheet: Worksheet) {
  const map = new Map<ImportColumn, number>();
  const headerRow = worksheet.getRow(1);

  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = cleanHeader(textValue(cell.value));

    for (const [column, aliases] of Object.entries(COLUMN_ALIASES) as Array<
      [ImportColumn, readonly string[]]
    >) {
      if (aliases.some((alias) => cleanHeader(alias) === header)) {
        map.set(column, columnNumber);
        break;
      }
    }
  });

  return map;
}

function mapIssueMessage(path: PropertyKey[], fallback: string) {
  const field = String(path[0] ?? "");
  const labels: Record<string, string> = {
    landlordName: "landlord name",
    landlordEmail: "landlord email",
    propertyName: "property name",
    propertyAddress: "property address",
    collectionMode: "how rent is collected",
    managementFeeType: "management fee type",
    managementFeeValue: "management fee value",
    paystackChargeBearer: "transaction charge payer",
    paymentReceiver: "payment receiver",
    unitLabel: "unit",
    rentFrequency: "rent frequency",
    rentAmount: "rent amount",
    tenantEmail: "tenant email",
    moveInDate: "tenancy start date",
    nextRentDueDate: "next rent due date",
    currentBalance: "rent still owing",
    lastPaymentAmount: "last payment",
    lastPaymentDate: "last payment date",
    paymentMethod: "payment method",
  };

  return labels[field] ? `Check ${labels[field]}: ${fallback}` : fallback;
}

export async function parseManagerImportWorkbook(file: File): Promise<{
  rows: ManagerImportRow[];
  issues: ManagerImportIssue[];
}> {
  if (file.size === 0) {
    return {
      rows: [],
      issues: [
        { rowNumber: 1, message: "Choose a file that contains records." },
      ],
    };
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message:
            "The file is larger than 900 KB. Split it into smaller files and import them one at a time.",
        },
      ],
    };
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".csv")) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message:
            "Use an Excel .xlsx file or a .csv file. Save older .xls files as .xlsx first.",
        },
      ],
    };
  }

  const workbook = new Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (lowerName.endsWith(".csv")) {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return {
      rows: [],
      issues: [
        { rowNumber: 1, message: "The workbook does not contain a worksheet." },
      ],
    };
  }

  const columnMap = buildColumnMap(worksheet);
  const requiredColumns: ImportColumn[] = [
    "landlordName",
    "propertyName",
    "propertyAddress",
    "collectionMode",
    "managementFeeType",
    "managementFeeValue",
    "paystackChargeBearer",
    "paymentReceiver",
    "unitLabel",
    "rentFrequency",
    "rentAmount",
  ];
  const missingColumns = requiredColumns.filter(
    (column) => !columnMap.has(column),
  );

  if (missingColumns.length > 0) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message:
            "The headings do not match the BOPA template. Download the template and paste your records into it.",
        },
      ],
    };
  }

  const rowCount = Math.max(worksheet.actualRowCount - 1, 0);
  if (rowCount > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message: `This file has ${rowCount} rows. Import at most ${MAX_IMPORT_ROWS} rows at a time.`,
        },
      ],
    };
  }

  const rows: ManagerImportRow[] = [];
  const issues: ManagerImportIssue[] = [];
  const inherited = new Map<ImportColumn, string>();
  const fillDownColumns: ImportColumn[] = [
    "landlordName",
    "landlordPhone",
    "landlordEmail",
    "landlordAddress",
    "propertyName",
    "propertyAddress",
    "city",
    "state",
    "lga",
    "collectionMode",
    "managementFeeType",
    "managementFeeValue",
    "paystackChargeBearer",
    "paymentReceiver",
  ];

  for (
    let rowNumber = 2;
    rowNumber <= worksheet.actualRowCount;
    rowNumber += 1
  ) {
    const excelRow = worksheet.getRow(rowNumber);
    const directValues = [...columnMap.entries()].map(([, columnNumber]) =>
      textValue(excelRow.getCell(columnNumber).value),
    );

    if (directValues.every((value) => !value)) {
      continue;
    }

    const read = (column: ImportColumn) => {
      const columnNumber = columnMap.get(column);
      const direct = columnNumber
        ? textValue(excelRow.getCell(columnNumber).value)
        : "";

      if (direct) {
        if (fillDownColumns.includes(column)) {
          inherited.set(column, direct);
        }
        return direct;
      }

      return fillDownColumns.includes(column)
        ? (inherited.get(column) ?? "")
        : "";
    };

    const candidate = {
      rowNumber,
      landlordName: read("landlordName"),
      landlordPhone: nullableText(read("landlordPhone")),
      landlordEmail: nullableText(read("landlordEmail"))?.toLowerCase() ?? null,
      landlordAddress: nullableText(read("landlordAddress")),
      propertyName: read("propertyName"),
      propertyAddress: read("propertyAddress"),
      city: nullableText(read("city")),
      state: nullableText(read("state")),
      lga: nullableText(read("lga")),
      collectionMode: choiceValue(read("collectionMode"), {
        "manager collects": "manager_collects",
        "landlord direct": "landlord_direct",
        "automatic split": "automatic_split",
      }),
      managementFeeType: choiceValue(read("managementFeeType"), {
        percentage: "percentage",
        "flat fee": "flat",
        flat: "flat",
      }),
      managementFeeValue: numberValue(read("managementFeeValue")),
      paystackChargeBearer: choiceValue(read("paystackChargeBearer"), {
        tenant: "tenant",
        landlord: "landlord",
        manager: "manager",
        bopa: "bopa",
      }),
      paymentReceiver: choiceValue(read("paymentReceiver"), {
        tenant: "other",
        landlord: "landlord",
        manager: "manager",
        "bopa verified": "bopa_verified",
        other: "other",
      }),
      unitLabel: read("unitLabel"),
      unitType: nullableText(read("unitType")),
      rentFrequency: choiceValue(read("rentFrequency"), {
        yearly: "annual",
        annual: "annual",
        monthly: "monthly",
        quarterly: "quarterly",
        "every 3 months": "quarterly",
        biannual: "biannual",
        "every 6 months": "biannual",
      }),
      rentAmount: numberValue(read("rentAmount")),
      tenantName: nullableText(read("tenantName")),
      tenantPhone: nullableText(read("tenantPhone")),
      tenantEmail: nullableText(read("tenantEmail"))?.toLowerCase() ?? null,
      occupation: nullableText(read("occupation")),
      moveInDate: dateValue(read("moveInDate")),
      nextRentDueDate: dateValue(read("nextRentDueDate")),
      currentBalance: numberValue(read("currentBalance"), 0),
      lastPaymentAmount: read("lastPaymentAmount")
        ? numberValue(read("lastPaymentAmount"))
        : null,
      lastPaymentDate: dateValue(read("lastPaymentDate")),
      paymentMethod: read("paymentMethod")
        ? choiceValue(read("paymentMethod"), {
            "bank transfer": "bank_transfer",
            cash: "cash",
            other: "other",
          })
        : null,
      paymentReference: nullableText(read("paymentReference")),
    };

    const parsed = managerImportRowSchema.safeParse(candidate);
    if (!parsed.success) {
      const messages = new Set(
        parsed.error.issues.map((issue) =>
          mapIssueMessage(issue.path, issue.message),
        ),
      );
      for (const message of messages) {
        issues.push({ rowNumber, message });
      }
      continue;
    }

    if (
      parsed.data.landlordPhone &&
      !tryNormalisePhoneNumber(parsed.data.landlordPhone)
    ) {
      issues.push({
        rowNumber,
        message: "Check landlord phone: enter a valid Nigerian phone number.",
      });
      continue;
    }

    if (
      parsed.data.tenantPhone &&
      !tryNormalisePhoneNumber(parsed.data.tenantPhone)
    ) {
      issues.push({
        rowNumber,
        message: "Check tenant phone: enter a valid Nigerian phone number.",
      });
      continue;
    }

    rows.push(parsed.data);
  }

  if (rows.length === 0 && issues.length === 0) {
    issues.push({
      rowNumber: 1,
      message: "No data rows were found below the headings.",
    });
  }

  if (Buffer.byteLength(JSON.stringify(rows), "utf8") > MAX_PREVIEW_BYTES) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message:
            "This checked file contains too much text for one import. Split it into smaller files and try again.",
        },
      ],
    };
  }

  return { rows, issues };
}

export async function buildManagerImportTemplate() {
  const workbook = new Workbook();
  workbook.creator = "BOPA Manager";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("BOPA import", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const instructions = workbook.addWorksheet("Read me");

  const columns = [
    ["Landlord name", 24],
    ["Landlord phone", 18],
    ["Landlord email", 25],
    ["Landlord address", 30],
    ["Property name", 24],
    ["Property address", 32],
    ["City", 18],
    ["State", 18],
    ["LGA", 18],
    ["How rent is collected", 22],
    ["Management fee type", 21],
    ["Management fee value", 21],
    ["Transaction charge paid by", 25],
    ["Usual payment receiver", 23],
    ["Unit", 14],
    ["Unit type", 18],
    ["Rent frequency", 18],
    ["Rent amount", 18],
    ["Tenant name", 24],
    ["Tenant phone", 18],
    ["Tenant email", 25],
    ["Occupation", 22],
    ["Tenancy start date", 20],
    ["Rent still owing", 18],
    ["Last payment amount", 20],
    ["Last payment date", 20],
    ["Payment method", 18],
    ["Payment reference", 22],
  ] as const;

  sheet.columns = columns.map(([header, width]) => ({ header, width }));
  sheet.getRow(1).height = 32;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2457D6" },
  };

  sheet.addRow([
    "Chief John Okafor",
    "08030000000",
    "john@example.com",
    "12 Aba Road, Port Harcourt",
    "Odogwu Property",
    "15 Stadium Road, Port Harcourt",
    "Port Harcourt",
    "Rivers",
    "Obio/Akpor",
    "Manager collects",
    "Percentage",
    10,
    "Manager",
    "Manager",
    "Flat 1",
    "2 bedroom flat",
    "Annual",
    1200000,
    "Ada Nwosu",
    "08031111111",
    "ada@example.com",
    "Teacher",
    "2025-04-01",
    0,
    1200000,
    "2025-04-01",
    "Bank transfer",
    "TRF-2025-001",
  ]);
  sheet.getRow(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F6FF" },
  };
  sheet.autoFilter = { from: "A1", to: "AB1" };

  const lists: Array<[string, string]> = [
    ["J", '"Manager collects,Landlord direct,Automatic split"'],
    ["K", '"Percentage,Flat fee"'],
    ["M", '"Tenant,Landlord,Manager,BOPA"'],
    ["N", '"Landlord,Manager,BOPA verified,Other"'],
    ["Q", '"Annual,Every 6 months,Quarterly,Monthly"'],
    ["AA", '"Bank transfer,Cash,Other"'],
  ];
  for (const [column, formula] of lists) {
    for (let rowNumber = 2; rowNumber <= 501; rowNumber += 1) {
      sheet.getCell(`${column}${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [formula],
      };
    }
  }

  instructions.columns = [{ width: 110 }];
  instructions.addRows([
    ["BOPA Manager import guide"],
    ["Use one row for each apartment or unit. The sample row can be replaced."],
    [
      "For several units in the same property, landlord and property details may be left blank after the first row; BOPA carries them down.",
    ],
    [
      "Tenant details are optional for vacant units. If a tenant is included, phone number and tenancy start date are required. BOPA calculates the next rent due date.",
    ],
    [
      "Last payment details are optional. If included, add the payment amount and date on the tenant's row.",
    ],
    ["Dates should use YYYY-MM-DD, for example 2026-07-22."],
    ["Do not rename the headings. Import no more than 500 rows at a time."],
    ["Old .xls files should be saved as .xlsx before upload."],
  ]);
  instructions.getRow(1).font = {
    bold: true,
    size: 16,
    color: { argb: "FF163A91" },
  };
  instructions.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
    row.height = 34;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
