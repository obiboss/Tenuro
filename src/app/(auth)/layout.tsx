import type { ReactNode } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
              <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight text-text-strong">
                Tenuro
              </p>
              <p className="text-xs font-semibold text-text-muted">
                Property records made simple
              </p>
            </div>
          </div>
        </Link>

        {children}
      </div>
    </main>
  );
}
