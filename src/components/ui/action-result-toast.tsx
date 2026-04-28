"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";

type ActionResultToastProps = {
  ok: boolean;
  message?: string;
  successTitle?: string;
  errorTitle?: string;
};

export function ActionResultToast({
  ok,
  message,
  successTitle = "Action completed",
  errorTitle = "Action failed",
}: ActionResultToastProps) {
  const { showToast } = useToast();
  const previousMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!message || previousMessageRef.current === message) {
      return;
    }

    previousMessageRef.current = message;

    showToast({
      title: ok ? successTitle : errorTitle,
      description: message,
      tone: ok ? "success" : "error",
    });
  }, [errorTitle, message, ok, showToast, successTitle]);

  return null;
}
