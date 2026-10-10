import Link from "next/link";
import type {
  PlatformAdminFreeToolsProduct,
  PlatformAdminFreeToolsUser,
} from "@/server/services/platform-admin-free-tools.service";

type AdminFreeToolsUsersTableProps = {
  users: PlatformAdminFreeToolsUser[];
  product: PlatformAdminFreeToolsProduct;
  total: number;
  viewAllHref?: string;
  title?: string;
  subtitle?: string;
};

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

export function AdminFreeToolsUsersTable({
  users,
  product,
  total,
  viewAllHref,
  title = "Top users",
  subtitle = "Ranked by documents generated in this period",
}: AdminFreeToolsUsersTableProps) {
  const showPaidRemaining = product !== "both";

  return (
    <section className="rounded-[18px] bg-white p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-text-strong">
            {title}
          </h2>
          <p className="mt-1 text-[13px] font-medium text-text-muted">
            {subtitle}
          </p>
        </div>

        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary-soft px-4 text-sm font-extrabold text-primary transition hover:bg-primary/15"
          >
            View all {total}
          </Link>
        ) : null}
      </div>

      {users.length === 0 ? (
        <p className="mt-6 text-sm font-medium text-text-muted">
          No activity in this period.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wide text-text-muted">
                <th className="pb-3 pr-4">Landlord</th>
                <th className="px-4 pb-3 text-right">Documents</th>
                <th className="px-4 pb-3 text-right">Free used</th>
                {showPaidRemaining ? (
                  <th className="px-4 pb-3 text-right">Paid remaining</th>
                ) : null}
                <th className="pb-3 pl-4 text-right">Last active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.identityFingerprint}
                  className="border-t border-border-soft text-sm"
                >
                  <td className="py-4 pr-4 font-bold text-text-strong">
                    {user.landlordName}
                  </td>
                  <td className="px-4 py-4 text-right font-extrabold tabular-nums text-text-strong">
                    {user.documentsGenerated.toLocaleString("en-NG")}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold tabular-nums text-text-muted">
                    {user.freeUsed.toLocaleString("en-NG")} of{" "}
                    {user.freeAllowance.toLocaleString("en-NG")}
                  </td>
                  {showPaidRemaining ? (
                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-text-muted">
                      {user.paidRemaining.toLocaleString("en-NG")}
                    </td>
                  ) : null}
                  <td className="py-4 pl-4 text-right font-semibold text-text-muted">
                    {formatDate(user.lastActive)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
