import Link from "next/link";
import { DeveloperLoginForm } from "@/components/developer/developer-login-form";
import { PageHeader } from "@/components/ui/page-header";

export default function DeveloperLoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-xl px-4 py-12 md:px-6">
        <Link href="/" className="mb-8 flex w-fit items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
            B
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight text-text-strong">
              Boldverse Property
            </p>
            <p className="text-xs font-semibold text-text-muted">
              Developer login
            </p>
          </div>
        </Link>

        <PageHeader
          title="Sign in as a developer"
          description="Access your estate sales workspace, buyer records, payment tracking, and developer tools."
        />

        <DeveloperLoginForm />
      </section>
    </main>
  );
}
