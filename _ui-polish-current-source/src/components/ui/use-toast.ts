"use client";

import { useToastContext } from "@/components/ui/toast-provider";

export function useToast() {
  return useToastContext();
}
