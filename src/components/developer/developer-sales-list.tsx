import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { DeveloperSaleWithDetails } from "@/server/repositories/developer-sales.repository";
import { formatNaira } from "@/server/utils/money";

type DeveloperSalesListProps = {
  sales: DeveloperSaleWithDetails[];
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export function DeveloperSalesList({ sales }: DeveloperSalesListProps) {
  return (
    <SectionCard
      title="Sales"
      description="Active and historical developer plot sales."
      action={
        <Link
          href="/developer/sales/new"
          className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
        >
          Create Sale
        </Link>
      }
    >
      {sales.length === 0 ? (
        <div className="rounded-button bg-background p-6 text-center">
          <p className="text-base font-black text-text-strong">No sales yet</p>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Assign a buyer to a plot, then convert the assignment into a locked
            sale.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-205 text-left text-sm">
            <thead>
              <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                <th className="py-3 pr-4 font-black">Reference</th>
                <th className="py-3 pr-4 font-black">Buyer</th>
                <th className="py-3 pr-4 font-black">Estate / Plot</th>
                <th className="py-3 pr-4 font-black">Locked Price</th>
                <th className="py-3 pr-4 font-black">Mode</th>
                <th className="py-3 pr-4 font-black">Status</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-border-soft">
                  <td className="py-4 pr-4">
                    <Link
                      href={`/developer/sales/${sale.id}`}
                      className="font-black text-primary"
                    >
                      {sale.sale_reference}
                    </Link>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-black text-text-strong">
                      {sale.developer_buyers?.full_name ?? "Buyer"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-text-muted">
                      {sale.developer_buyers?.phone_number ?? "—"}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-text-strong">
                      {sale.developer_estates?.estate_name ?? "Estate"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-text-muted">
                      Plot {sale.developer_plots?.plot_number ?? "—"}
                    </p>
                  </td>
                  <td className="py-4 pr-4 font-black text-text-strong">
                    {formatNaira(Number(sale.total_price_locked))}
                  </td>
                  <td className="py-4 pr-4 font-semibold text-text-muted">
                    {formatStatus(sale.payment_plan_mode)}
                  </td>
                  <td className="py-4 pr-4">
                    <Badge tone="primary">{formatStatus(sale.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
