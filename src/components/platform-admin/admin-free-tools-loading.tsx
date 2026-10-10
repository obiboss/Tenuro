function Placeholder({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export function AdminFreeToolsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading free-tools reporting">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-44 rounded-[18px] bg-white p-6 shadow-soft">
            <Placeholder className="h-4 w-24" />
            <Placeholder className="mt-5 h-10 w-28" />
            <Placeholder className="mt-4 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-[18px] bg-white p-6 shadow-soft">
        <Placeholder className="h-5 w-48" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Placeholder key={index} className="h-40 w-full" />
          ))}
        </div>
      </div>
      <div className="h-80 rounded-[18px] bg-white p-6 shadow-soft">
        <Placeholder className="h-5 w-32" />
        <Placeholder className="mt-6 h-56 w-full" />
      </div>
    </div>
  );
}
