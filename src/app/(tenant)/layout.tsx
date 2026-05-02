import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth.actions";
import { requireTenant } from "@/server/services/auth.service";

type TenantLayoutProps = {
  children: React.ReactNode;
};

export default async function TenantLayout({ children }: TenantLayoutProps) {
  const tenant = await requireTenant();

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border-soft bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/tenant" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
              <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight text-text-strong">
                Tenuro
              </p>
              <p className="text-xs font-semibold text-text-muted">
                Tenant dashboard
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <p className="hidden text-sm font-bold text-text-muted sm:block">
              {tenant.fullName}
            </p>

            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-extrabold text-text-strong shadow-soft hover:bg-background"
              >
                <LogOut aria-hidden="true" size={16} strokeWidth={2.6} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:py-10">
        {children}
      </section>
    </main>
  );
}
