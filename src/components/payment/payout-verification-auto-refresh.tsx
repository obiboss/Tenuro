"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { PayoutVerificationStatusPayload } from "@/lib/payout-verification";

type PayoutVerificationAutoRefreshProps = {
  enabled: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 25_000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const PAYOUT_VERIFICATION_STATUS_URL = "/api/payout-verification/status";

export function PayoutVerificationAutoRefresh({
  enabled,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: PayoutVerificationAutoRefreshProps) {
  const router = useRouter();
  const hasRefreshedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const startedAt = Date.now();
    let intervalId: number | undefined;
    let isActive = true;

    async function pollStatus() {
      if (!isActive) {
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
        }

        return;
      }

      try {
        const response = await fetch(PAYOUT_VERIFICATION_STATUS_URL, {
          cache: "no-store",
        });

        if (!response.ok || !isActive) {
          return;
        }

        const status = (await response.json()) as PayoutVerificationStatusPayload;

        if (status.state === "verified" && !hasRefreshedRef.current) {
          hasRefreshedRef.current = true;

          if (intervalId !== undefined) {
            window.clearInterval(intervalId);
          }

          router.refresh();
          return;
        }

        if (status.state !== "unverified" && intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      } catch {
        // Keep polling until timeout when transient network errors occur.
      }
    }

    void pollStatus();
    intervalId = window.setInterval(() => {
      void pollStatus();
    }, pollIntervalMs);

    return () => {
      isActive = false;

      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled, pollIntervalMs, timeoutMs, router]);

  return null;
}
