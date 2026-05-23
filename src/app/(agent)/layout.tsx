import { redirect } from "next/navigation";
import { AgentShell } from "@/components/layout/agent-shell";
import { getHomePathForRole } from "@/lib/auth-routing";
import { getSessionUser } from "@/server/services/auth.service";

type AgentLayoutProps = {
  children: React.ReactNode;
};

export default async function AgentLayout({ children }: AgentLayoutProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/agent/login");
  }

  if (user.role !== "agent") {
    redirect(getHomePathForRole(user.role));
  }

  return <AgentShell agentName={user.fullName}>{children}</AgentShell>;
}
