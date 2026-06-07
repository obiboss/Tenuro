import Link from "next/link";
import { DeveloperRegisterForm } from "@/components/developer/developer-register-form";
import { PageHeader } from "@/components/ui/page-header";

export default function DeveloperRegisterPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <Link href="/" className="mb-8 flex w-fit items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
            B
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight text-text-strong">
              Boldverse Property
            </p>
            <p className="text-xs font-semibold text-text-muted">
              Developer registration
            </p>
          </div>
        </Link>

        <PageHeader
          title="Create your developer workspace"
          description="Set up a separate developer account for estate projects, plot sales, buyer payment tracking, and document control."
        />

        <DeveloperRegisterForm />
      </section>
    </main>
  );
}
