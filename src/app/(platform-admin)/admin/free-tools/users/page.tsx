import Link from "next/link";
import { AdminFreeToolsControls } from "@/components/platform-admin/admin-free-tools-controls";
import { AdminFreeToolsUsersTable } from "@/components/platform-admin/admin-free-tools-users-table";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPlatformAdminFreeToolsReport,
  parsePlatformAdminFreeToolsPeriod,
  parsePlatformAdminFreeToolsProduct,
} from "@/server/services/platform-admin-free-tools.service";
import { requirePlatformAdminPage } from "@/server/services/platform-admin.service";

const PAGE_SIZE = 25;

type PlatformAdminFreeToolsUsersPageProps = {
  searchParams: Promise<{
    period?: string;
    product?: string;
    page?: string;
    search?: string;
  }>;
};

function positiveInteger(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function PlatformAdminFreeToolsUsersPage({
  searchParams,
}: PlatformAdminFreeToolsUsersPageProps) {
  await requirePlatformAdminPage();
  const params = await searchParams;
  const periodDays = parsePlatformAdminFreeToolsPeriod(params.period);
  const product = parsePlatformAdminFreeToolsProduct(params.product);
  const page = positiveInteger(params.page);
  const search = params.search?.trim().slice(0, 100) || undefined;
  const report = await getPlatformAdminFreeToolsReport({
    periodDays,
    product,
    page,
    pageSize: PAGE_SIZE,
    search,
  });
  const pageCount = Math.max(Math.ceil(report.topUsersTotal / PAGE_SIZE), 1);

  function pageHref(nextPage: number) {
    const query = new URLSearchParams({
      period: String(periodDays),
      product,
      page: String(nextPage),
    });
    if (search) query.set("search", search);
    return `/admin/free-tools/users?${query.toString()}`;
  }

  const overviewQuery = new URLSearchParams({
    period: String(periodDays),
    product,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Free tools users"
        description="Review landlords who completed documents in the selected period."
        action={<AdminFreeToolsControls periodDays={periodDays} product={product} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/admin/free-tools?${overviewQuery.toString()}`}
          className="text-sm font-extrabold text-primary hover:underline"
        >
          Back to overview
        </Link>

        <form action="/admin/free-tools/users" method="get" className="flex gap-2">
          <input type="hidden" name="period" value={periodDays} />
          <input type="hidden" name="product" value={product} />
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search landlord"
            className="min-h-10 w-full rounded-button border border-border-soft bg-white px-3 text-sm text-text-strong outline-none focus:border-primary sm:w-64"
          />
          <button
            type="submit"
            className="min-h-10 rounded-button bg-primary px-4 text-sm font-extrabold text-white"
          >
            Search
          </button>
        </form>
      </div>

      <AdminFreeToolsUsersTable
        users={report.topUsers}
        product={product}
        total={report.topUsersTotal}
        title="All users"
        subtitle={`${report.topUsersTotal.toLocaleString("en-NG")} users found`}
      />

      <nav className="mt-4 flex items-center justify-between" aria-label="Users pagination">
        {page > 1 ? (
          <Link
            href={pageHref(page - 1)}
            className="rounded-button bg-white px-4 py-2 text-sm font-extrabold text-primary shadow-soft"
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        <span className="text-sm font-semibold text-text-muted">
          Page {Math.min(page, pageCount)} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={pageHref(page + 1)}
            className="rounded-button bg-white px-4 py-2 text-sm font-extrabold text-primary shadow-soft"
          >
            Next
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
