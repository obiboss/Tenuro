import { AgentShell } from "@/components/layout/agent-shell";
import { requireAgent } from "@/server/services/auth.service";

type AgentLayoutProps = {
  children: React.ReactNode;
};

export default async function AgentLayout({ children }: AgentLayoutProps) {
  const agent = await requireAgent();

  return <AgentShell agentName={agent.fullName}>{children}</AgentShell>;
}
