import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { DeveloperBuyerRow } from "@/server/repositories/developer-buyers.repository";

type DeveloperBuyersListProps = {
  buyers: DeveloperBuyerRow[];
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function DeveloperBuyersList({ buyers }: DeveloperBuyersListProps) {
  return (
    <SectionCard
      title="Buyer Records"
      description="Buyers created under this developer account."
      action={
        <Link
          href="/developer/buyers/new"
          className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
        >
          Add Buyer
        </Link>
      }
    >
      {buyers.length === 0 ? (
        <div className="rounded-button bg-background p-6 text-center">
          <p className="text-base font-black text-text-strong">No buyers yet</p>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Create buyer records before assigning them to estate plots.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                <th className="py-3 pr-4 font-black">Buyer</th>
                <th className="py-3 pr-4 font-black">Phone</th>
                <th className="py-3 pr-4 font-black">NIN</th>
                <th className="py-3 pr-4 font-black">Next of Kin</th>
                <th className="py-3 pr-4 font-black">Status</th>
              </tr>
            </thead>

            <tbody>
              {buyers.map((buyer) => (
                <tr key={buyer.id} className="border-b border-border-soft">
                  <td className="py-4 pr-4">
                    <p className="font-black text-text-strong">
                      {buyer.full_name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-text-muted">
                      {buyer.email ?? "No email"}
                    </p>
                  </td>
                  <td className="py-4 pr-4 font-semibold text-text-muted">
                    {buyer.phone_number}
                  </td>
                  <td className="py-4 pr-4 font-semibold text-text-muted">
                    {buyer.nin ?? "—"}
                  </td>
                  <td className="py-4 pr-4 font-semibold text-text-muted">
                    {buyer.next_of_kin_name ?? "—"}
                  </td>
                  <td className="py-4 pr-4">
                    <Badge tone="primary">{formatStatus(buyer.status)}</Badge>
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
