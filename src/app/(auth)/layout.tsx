import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 flex w-fit items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
            B
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight text-text-strong">
              Boldverse Property
            </p>
            <p className="text-xs font-semibold text-text-muted">
              Property Management for Modern Landlords
            </p>
          </div>
        </Link>

        {children}
      </div>
    </main>
  );
}
