import type { ReactNode } from "react";
import { PwaRuntime } from "@/components/pwa/pwa-runtime";

type Props = {
  children: ReactNode;
};

export default function RootTemplate({ children }: Props) {
  return (
    <>
      {children}
      <PwaRuntime />
    </>
  );
}
