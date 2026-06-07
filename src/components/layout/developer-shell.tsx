import Link from "next/link";
import { developerSignOutAction } from "@/actions/developer-auth.actions";

type DeveloperShellProps = {
  developerName: string;
  companyName?: string | null;
  children: React.ReactNode;
};

export function DeveloperShell({
  developerName,
  companyName,
  children,
}: DeveloperShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-soft bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/developer" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
              B
            </div>

            <div>
              <p className="text-base font-extrabold text-text-strong">
                Boldverse Property
              </p>
              <p className="text-xs font-semibold text-text-muted">
                Developer workspace
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-extrabold text-text-strong">
                {developerName}
              </p>
              <p className="text-xs font-semibold text-text-muted">
                {companyName ?? "Developer account"}
              </p>
            </div>

            <form action={developerSignOutAction}>
              <button
                type="submit"
                className="min-h-10 rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
