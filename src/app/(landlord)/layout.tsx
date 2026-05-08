import { LandlordShell } from "@/components/layout/landlord-shell";
import { requireLandlord } from "@/server/services/auth.service";

type LandlordLayoutProps = {
  children: React.ReactNode;
};

export default async function LandlordLayout({
  children,
}: LandlordLayoutProps) {
  const landlord = await requireLandlord();

  return (
    <LandlordShell landlordName={landlord.fullName}>{children}</LandlordShell>
  );
}
