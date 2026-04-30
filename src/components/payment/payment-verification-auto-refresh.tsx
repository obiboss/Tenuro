"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

type PaymentVerificationAutoRefreshProps = {
  enabled: boolean;
  intervalMs?: number;
};

export function PaymentVerificationAutoRefresh({
  enabled,
  intervalMs = 4000,
}: PaymentVerificationAutoRefreshProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, router]);

  return null;
}
