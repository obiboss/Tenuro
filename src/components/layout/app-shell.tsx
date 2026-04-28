import type { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type AppShellProps = {
  children: ReactNode;
  landlordName?: string;
};

export function AppShell({ children, landlordName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar landlordName={landlordName} />

      <main className="px-4 pb-24 pt-6 md:px-8 lg:ml-72 lg:pb-10">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
