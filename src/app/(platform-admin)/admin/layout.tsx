import type { Metadata } from "next";
import { PlatformAdminShell } from "@/components/layout/platform-admin-shell";
import { requirePlatformAdminPage } from "@/server/services/platform-admin.service";

type PlatformAdminLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "Platform Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlatformAdminLayout({
  children,
}: PlatformAdminLayoutProps) {
  const admin = await requirePlatformAdminPage();

  return (
    <PlatformAdminShell adminName={admin.fullName}>
      {children}
    </PlatformAdminShell>
  );
}
