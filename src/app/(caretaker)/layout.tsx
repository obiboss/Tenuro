import { redirect } from "next/navigation";
import { CaretakerShell } from "@/components/layout/caretaker-shell";
import { getHomePathForRole } from "@/lib/auth-routing";
import { getSessionUser } from "@/server/services/auth.service";

type CaretakerLayoutProps = {
  children: React.ReactNode;
};

export default async function CaretakerLayout({
  children,
}: CaretakerLayoutProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "caretaker") {
    redirect(getHomePathForRole(user.role));
  }

  return (
    <CaretakerShell caretakerName={user.fullName}>{children}</CaretakerShell>
  );
}
