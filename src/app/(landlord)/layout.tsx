import { LandlordShell } from "@/components/layout/landlord-shell";
import { requireUser } from "@/server/services/auth.service";

type LandlordLayoutProps = {
  children: React.ReactNode;
};

export default async function LandlordLayout({
  children,
}: LandlordLayoutProps) {
  const user = await requireUser();

  return <LandlordShell landlordName={user.fullName}>{children}</LandlordShell>;
}
