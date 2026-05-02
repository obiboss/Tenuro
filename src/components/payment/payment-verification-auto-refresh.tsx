"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type PaymentVerificationAutoRefreshProps = {
  enabled: boolean;
  intervalMs?: number;
};

export function PaymentVerificationAutoRefresh({
  enabled,
  intervalMs = 2500,
}: PaymentVerificationAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, intervalMs, router]);

  return null;
}
