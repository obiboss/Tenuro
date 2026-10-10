import { AdminFreeToolsUsersTable } from "@/components/platform-admin/admin-free-tools-users-table";
import { AdminIdentityLinkingControl } from "@/components/platform-admin/admin-identity-linking-control";
import type { PlatformAdminFreeToolsReport } from "@/server/services/platform-admin-free-tools.service";

type AdminFreeToolsOverviewProps = {
  report: PlatformAdminFreeToolsReport;
  identityLinkingEnabled: boolean;
};

const MINIMUM_CONVERSION_SAMPLE_SIZE = 10;

function formatNumber(value: number) {
  return value.toLocaleString("en-NG");
}

function formatNairaFromKobo(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function Comparison({
  current,
  previous,
  days,
  formatDifference = formatNumber,
}: {
  current: number;
  previous: number;
  days: number;
  formatDifference?: (value: number) => string;
}) {
  const difference = current - previous;
  const color =
    difference > 0
      ? "text-success"
      : difference < 0
        ? "text-danger"
        : "text-text-muted";

  return (
    <p className={`mt-2 text-[13px] font-semibold ${color}`}>
      {difference > 0 ? "+" : ""}
      {formatDifference(difference)} vs previous {days} days
    </p>
  );
}

function KpiCard({
  label,
  value,
  current,
  previous,
  days,
  detail,
  formatDifference,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  days: number;
  detail?: string;
  formatDifference?: (value: number) => string;
}) {
  return (
    <article className="rounded-[18px] bg-white p-5 shadow-soft md:p-6">
      <p className="text-sm font-semibold text-text-normal">{label}</p>
      <p className="mt-3 text-[38px] font-extrabold leading-none tracking-tight text-text-strong">
        {value}
      </p>
      <Comparison
        current={current}
        previous={previous}
        days={days}
        formatDifference={formatDifference}
      />
      {detail ? (
        <p className="mt-2 text-[13px] font-medium text-text-muted">{detail}</p>
      ) : null}
    </article>
  );
}

function ConversionTile({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: number;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[16px] bg-[#f7f5f2] p-5">
      <p className="text-sm font-semibold text-text-normal">{label}</p>
      <p
        className={`mt-3 text-[34px] font-extrabold leading-none tracking-tight ${
          accent ? "text-primary" : "text-text-strong"
        }`}
      >
        {formatNumber(value)}
      </p>
      <p className="mt-3 text-[13px] font-medium text-text-muted">{detail}</p>
    </div>
  );
}

export function AdminFreeToolsOverview({
  report,
  identityLinkingEnabled,
}: AdminFreeToolsOverviewProps) {
  const { kpis, conversion, reconciliation } = report;
  const query = new URLSearchParams({
    period: String(report.periodDays),
    product: report.product,
  });

  return (
    <div className="space-y-6">
      <AdminIdentityLinkingControl enabled={identityLinkingEnabled} />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <KpiCard
          label="Unique users"
          value={formatNumber(kpis.uniqueUsers.current)}
          current={kpis.uniqueUsers.current}
          previous={kpis.uniqueUsers.previous}
          days={report.periodDays}
          detail={`${formatNumber(kpis.uniqueUsers.returning)} returning`}
        />
        <KpiCard
          label="Documents generated"
          value={formatNumber(kpis.documentsGenerated.current)}
          current={kpis.documentsGenerated.current}
          previous={kpis.documentsGenerated.previous}
          days={report.periodDays}
          detail={`${formatNumber(kpis.documentsGenerated.receipts)} receipts · ${formatNumber(kpis.documentsGenerated.agreements)} agreements`}
        />
        <KpiCard
          label="Paid users"
          value={formatNumber(kpis.paidUsers.current)}
          current={kpis.paidUsers.current}
          previous={kpis.paidUsers.previous}
          days={report.periodDays}
        />
        <KpiCard
          label="Revenue"
          value={formatNairaFromKobo(kpis.revenue.currentKobo)}
          current={kpis.revenue.currentKobo}
          previous={kpis.revenue.previousKobo}
          days={report.periodDays}
          formatDifference={formatNairaFromKobo}
        />
      </section>

      <section className="rounded-[18px] bg-white p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-text-strong">
              Free credit conversion
            </h2>
            <p className="mt-1 text-[13px] font-medium text-text-muted">
              Landlords active in this period who used up their free credits
            </p>
          </div>
          <span className="inline-flex min-h-8 items-center self-start rounded-full bg-primary-soft px-3 text-xs font-extrabold text-primary">
            {conversion.usedAllFree < MINIMUM_CONVERSION_SAMPLE_SIZE
              ? "Too early"
              : conversion.percentage === null
                ? "No data yet"
                : `${conversion.percentage.toLocaleString("en-NG", {
                    maximumFractionDigits: 1,
                  })}% went on to pay`}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <ConversionTile
            label="Used all free credits"
            value={conversion.usedAllFree}
            detail={`${formatNumber(conversion.receiptsUsedAllFree)} receipts · ${formatNumber(conversion.agreementsUsedAllFree)} agreements`}
          />
          <ConversionTile
            label="Went on to pay"
            value={conversion.wentOnToPay}
            detail="Bought a bundle"
            accent
          />
          <ConversionTile
            label="Still unpaid"
            value={conversion.stillUnpaid}
            detail="Used up free credits, bought nothing"
          />
        </div>
      </section>

      <section className="rounded-[18px] bg-white p-5 shadow-soft md:p-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-text-strong">
            Credit reconciliation
          </h2>
          <p className="mt-1 text-[13px] font-medium text-text-muted">
            All-time completed documents compared with credits consumed
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {reconciliation.summary.map((row) => (
            <div key={row.product} className="rounded-[16px] bg-[#f7f5f2] p-5">
              <p className="text-sm font-extrabold text-text-strong">
                {row.product === "receipt"
                  ? "Rent receipts"
                  : "Tenancy agreements"}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-text-muted">Completed</dt>
                  <dd className="mt-1 text-2xl font-extrabold text-text-strong">
                    {formatNumber(row.completedDocuments)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Credits consumed</dt>
                  <dd className="mt-1 text-2xl font-extrabold text-text-strong">
                    {formatNumber(row.consumedCredits)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Legacy documents</dt>
                  <dd className="mt-1 text-2xl font-extrabold text-text-strong">
                    {formatNumber(row.legacyDocuments)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">
                    Consumed without completion
                  </dt>
                  <dd
                    className={`mt-1 text-2xl font-extrabold ${row.consumedWithoutCompletion > 0 ? "text-danger" : "text-success"}`}
                  >
                    {formatNumber(row.consumedWithoutCompletion)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {reconciliation.failures.length > 0 ? (
          <div className="mt-5 rounded-[16px] border border-danger/20 bg-danger/5 p-4">
            <p className="text-sm font-extrabold text-danger">Needs review</p>
            <div className="mt-3 space-y-2">
              {reconciliation.failures.map((failure) => (
                <div
                  key={`${failure.product}-${failure.identityFingerprint}`}
                  className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-semibold text-text-strong">
                    {failure.landlordName} ·{" "}
                    {failure.identityFingerprint.slice(0, 12)}…
                  </span>
                  <span className="font-semibold text-text-muted">
                    {failure.missingCompletions} credit
                    {failure.missingCompletions === 1 ? "" : "s"} without
                    completion
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <AdminFreeToolsUsersTable
        users={report.topUsers}
        product={report.product}
        total={report.topUsersTotal}
        viewAllHref={`/admin/free-tools/users?${query.toString()}`}
      />
    </div>
  );
}
