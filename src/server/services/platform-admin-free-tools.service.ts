import "server-only";

import { AppError } from "@/server/errors/app-error";
import { requirePlatformAdmin } from "@/server/services/platform-admin.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type PlatformAdminFreeToolsProduct =
  | "receipt"
  | "tenancy_agreement"
  | "both";

export type PlatformAdminFreeToolsPeriod = 7 | 30 | 60 | 90;

export type PlatformAdminFreeToolsUser = {
  identityFingerprint: string;
  landlordName: string;
  documentsGenerated: number;
  freeUsed: number;
  freeAllowance: number;
  paidRemaining: number;
  lastActive: string;
};

export type PlatformAdminCreditReconciliation = {
  summary: Array<{
    product: PublicDocumentProduct;
    completedDocuments: number;
    consumedCredits: number;
    legacyDocuments: number;
    consumedWithoutCompletion: number;
  }>;
  failures: Array<{
    product: PublicDocumentProduct;
    identityFingerprint: string;
    landlordName: string;
    consumed: number;
    completed: number;
    missingCompletions: number;
  }>;
};

type PublicDocumentProduct = "receipt" | "tenancy_agreement";

export type PlatformAdminFreeToolsReport = {
  periodDays: PlatformAdminFreeToolsPeriod;
  product: PlatformAdminFreeToolsProduct;
  periodStart: string;
  periodEnd: string;
  kpis: {
    uniqueUsers: { current: number; previous: number; returning: number };
    documentsGenerated: {
      current: number;
      previous: number;
      receipts: number;
      agreements: number;
    };
    paidUsers: { current: number; previous: number };
    revenue: { currentKobo: number; previousKobo: number };
  };
  conversion: {
    usedAllFree: number;
    wentOnToPay: number;
    stillUnpaid: number;
    receiptsUsedAllFree: number;
    agreementsUsedAllFree: number;
    paidBeforeFreeExhausted: number;
    percentage: number | null;
  };
  topUsersTotal: number;
  page: number;
  pageSize: number;
  topUsers: PlatformAdminFreeToolsUser[];
  reconciliation: PlatformAdminCreditReconciliation;
};

// Add known internal/test fingerprints here. The RPC excludes them from every
// KPI, conversion count, revenue total, and user table.
export const FREE_TOOLS_EXCLUDED_IDENTITY_FINGERPRINTS: readonly string[] = [
  "b29784c9e5a8aa3e09146351689bd170c5fd6c8250758c447095691714a9102b",
];

export function parsePlatformAdminFreeToolsPeriod(
  value: string | undefined,
): PlatformAdminFreeToolsPeriod {
  const parsed = Number(value);
  return parsed === 7 || parsed === 60 || parsed === 90 ? parsed : 30;
}

export function parsePlatformAdminFreeToolsProduct(
  value: string | undefined,
): PlatformAdminFreeToolsProduct {
  return value === "receipt" || value === "tenancy_agreement" ? value : "both";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapReconciliation(value: unknown): PlatformAdminCreditReconciliation {
  const reconciliation = recordValue(value);
  const summary = Array.isArray(reconciliation.summary)
    ? reconciliation.summary
    : [];
  const failures = Array.isArray(reconciliation.failures)
    ? reconciliation.failures
    : [];

  return {
    summary: summary.map((item) => {
      const row = recordValue(item);
      return {
        product: String(row.product_type) as PublicDocumentProduct,
        completedDocuments: numberValue(row.completed_documents),
        consumedCredits: numberValue(row.consumed_credits),
        legacyDocuments: numberValue(row.legacy_documents),
        consumedWithoutCompletion: numberValue(row.consumed_without_completion),
      };
    }),
    failures: failures.map((item) => {
      const row = recordValue(item);
      return {
        product: String(row.product_type) as PublicDocumentProduct,
        identityFingerprint: String(row.identity_fingerprint ?? ""),
        landlordName: String(row.landlord_name ?? "Unknown landlord"),
        consumed: numberValue(row.consumed),
        completed: numberValue(row.completed),
        missingCompletions: numberValue(row.missing_completions),
      };
    }),
  };
}

function mapReport(
  value: unknown,
  reconciliationValue: unknown,
): PlatformAdminFreeToolsReport {
  const report = recordValue(value);
  const kpis = recordValue(report.kpis);
  const uniqueUsers = recordValue(kpis.unique_users);
  const documents = recordValue(kpis.documents_generated);
  const paidUsers = recordValue(kpis.paid_users);
  const revenue = recordValue(kpis.revenue);
  const conversion = recordValue(report.conversion);
  const users = Array.isArray(report.top_users) ? report.top_users : [];

  return {
    periodDays: parsePlatformAdminFreeToolsPeriod(String(report.period_days)),
    product: parsePlatformAdminFreeToolsProduct(String(report.product)),
    periodStart: String(report.period_start ?? ""),
    periodEnd: String(report.period_end ?? ""),
    kpis: {
      uniqueUsers: {
        current: numberValue(uniqueUsers.current),
        previous: numberValue(uniqueUsers.previous),
        returning: numberValue(uniqueUsers.returning),
      },
      documentsGenerated: {
        current: numberValue(documents.current),
        previous: numberValue(documents.previous),
        receipts: numberValue(documents.receipts),
        agreements: numberValue(documents.agreements),
      },
      paidUsers: {
        current: numberValue(paidUsers.current),
        previous: numberValue(paidUsers.previous),
      },
      revenue: {
        currentKobo: numberValue(revenue.current_kobo),
        previousKobo: numberValue(revenue.previous_kobo),
      },
    },
    conversion: {
      usedAllFree: numberValue(conversion.used_all_free),
      wentOnToPay: numberValue(conversion.went_on_to_pay),
      stillUnpaid: numberValue(conversion.still_unpaid),
      receiptsUsedAllFree: numberValue(conversion.receipts_used_all_free),
      agreementsUsedAllFree: numberValue(conversion.agreements_used_all_free),
      paidBeforeFreeExhausted: numberValue(
        conversion.paid_before_free_exhausted,
      ),
      percentage:
        conversion.percentage === null || conversion.percentage === undefined
          ? null
          : numberValue(conversion.percentage),
    },
    topUsersTotal: numberValue(report.top_users_total),
    page: Math.max(numberValue(report.page), 1),
    pageSize: Math.max(numberValue(report.page_size), 1),
    topUsers: users.map((item) => {
      const user = recordValue(item);
      return {
        identityFingerprint: String(user.identity_fingerprint ?? ""),
        landlordName: String(user.landlord_name ?? "Unknown landlord"),
        documentsGenerated: numberValue(user.documents_generated),
        freeUsed: numberValue(user.free_used),
        freeAllowance: numberValue(user.free_allowance),
        paidRemaining: numberValue(user.paid_remaining),
        lastActive: String(user.last_active ?? ""),
      };
    }),
    reconciliation: mapReconciliation(reconciliationValue),
  };
}

export async function getPlatformAdminFreeToolsReport(params: {
  periodDays: PlatformAdminFreeToolsPeriod;
  product: PlatformAdminFreeToolsProduct;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const [reportResult, reconciliationResult] = await Promise.all([
    supabase.rpc("get_platform_admin_free_tools", {
      p_period_days: params.periodDays,
      p_product: params.product,
      p_page: Math.max(params.page ?? 1, 1),
      p_page_size: Math.min(Math.max(params.pageSize ?? 10, 1), 100),
      p_search: params.search?.trim() || null,
      p_excluded_fingerprints: [...FREE_TOOLS_EXCLUDED_IDENTITY_FINGERPRINTS],
    }),
    supabase.rpc("get_platform_admin_credit_reconciliation", {
      p_product: params.product,
      p_excluded_fingerprints: [...FREE_TOOLS_EXCLUDED_IDENTITY_FINGERPRINTS],
    }),
  ]);

  if (reportResult.error) throw reportResult.error;
  if (reconciliationResult.error) throw reconciliationResult.error;

  if (!reportResult.data || typeof reportResult.data !== "object") {
    throw new AppError(
      "PLATFORM_ADMIN_FREE_TOOLS_UNAVAILABLE",
      "Free-tools reporting is unavailable.",
      500,
    );
  }

  return mapReport(reportResult.data, reconciliationResult.data);
}

export async function getPublicDocumentIdentityLinkingSetting() {
  const { data, error } = await createSupabaseAdminClient()
    .from("public_document_feature_settings")
    .select("enabled,updated_at")
    .eq("feature_key", "identity_linking")
    .single();

  if (error) throw error;

  return {
    enabled: data.enabled === true,
    updatedAt: String(data.updated_at),
  };
}

export async function setPublicDocumentIdentityLinkingSetting(
  enabled: boolean,
) {
  const admin = await requirePlatformAdmin();
  const { error } = await createSupabaseAdminClient()
    .from("public_document_feature_settings")
    .update({
      enabled,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .eq("feature_key", "identity_linking");

  if (error) throw error;
}
