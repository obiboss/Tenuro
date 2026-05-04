import Link from "next/link";
import { Building2 } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { TenantMobileNav } from "@/components/layout/tenant-mobile-nav";
import { requireTenant } from "@/server/services/auth.service";

type TenantLayoutProps = {
  children: React.ReactNode;
};

export default async function TenantLayout({ children }: TenantLayoutProps) {
  const tenant = await requireTenant();

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border-soft bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/tenant" className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
              <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight text-text-strong">
                Tenuro
              </p>
              <p className="truncate text-xs font-semibold text-text-muted">
                Tenant dashboard
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <p className="hidden text-sm font-bold text-text-muted sm:block">
              {tenant.fullName}
            </p>

            <LogoutButton className="shrink-0" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 pb-28 md:px-6 lg:py-10">
        {children}
      </section>

      <TenantMobileNav />
    </main>
  );
}
