import type { ReactNode } from "react";
import { PwaRuntime } from "@/components/pwa/pwa-runtime";
import { RoleAwareWorkflowPrefetch } from "@/components/pwa/role-aware-workflow-prefetch";

type Props = {
  children: ReactNode;
};

export default function RootTemplate({ children }: Props) {
  return (
    <>
      {children}
      <RoleAwareWorkflowPrefetch />
      <PwaRuntime />
    </>
  );
}
