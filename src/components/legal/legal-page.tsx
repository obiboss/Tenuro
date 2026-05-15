type LegalPageProps = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="mb-12 border-b border-gray-200 pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Legal
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {title}
          </h1>

          <p className="mt-4 text-sm text-gray-500">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700">
          {children}
        </div>
      </div>
    </main>
  );
}
