import { AdminFreeToolsLoading } from "@/components/platform-admin/admin-free-tools-loading";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 space-y-3">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-slate-200" />
      </div>
      <AdminFreeToolsLoading />
    </div>
  );
}
