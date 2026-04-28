import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type TopbarProps = {
  landlordName?: string;
};

export function Topbar({ landlordName = "Landlord" }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border-soft bg-background/90 px-4 py-4 backdrop-blur md:px-8 lg:ml-72">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text-muted">Welcome back</p>
          <h1 className="text-xl font-extrabold tracking-tight text-text-strong">
            {landlordName}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search records"
            className="hidden size-11 items-center justify-center rounded-button bg-surface text-text-normal shadow-soft transition hover:bg-primary-soft hover:text-primary sm:flex"
          >
            <Search aria-hidden="true" size={21} strokeWidth={2.6} />
          </button>

          <button
            type="button"
            aria-label="View notifications"
            className="size-11 rounded-button bg-surface text-text-normal shadow-soft transition hover:bg-primary-soft hover:text-primary"
          >
            <span className="flex size-full items-center justify-center">
              <Bell aria-hidden="true" size={21} strokeWidth={2.6} />
            </span>
          </button>

          <Button size="md" className="hidden sm:inline-flex">
            Add Tenant
          </Button>
        </div>
      </div>
    </header>
  );
}
