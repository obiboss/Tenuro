"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastProps = {
  toast: ToastItem;
  onDismiss: (id: string) => void;
};

const toneStyles: Record<
  ToastTone,
  {
    container: string;
    icon: string;
    iconNode: React.ReactNode;
  }
> = {
  success: {
    container: "border-success/20 bg-white",
    icon: "bg-success-soft text-success",
    iconNode: <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  error: {
    container: "border-danger/20 bg-white",
    icon: "bg-danger-soft text-danger",
    iconNode: <XCircle aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  warning: {
    container: "border-warning/20 bg-white",
    icon: "bg-warning-soft text-warning",
    iconNode: <AlertTriangle aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
  info: {
    container: "border-primary/20 bg-white",
    icon: "bg-primary-soft text-primary",
    iconNode: <Info aria-hidden="true" size={20} strokeWidth={2.6} />,
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const styles = toneStyles[toast.tone];

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto w-full rounded-card border p-4 shadow-card",
        "animate-in slide-in-from-top-2 fade-in duration-200",
        styles.container,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            styles.icon,
          )}
        >
          {styles.iconNode}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-text-strong">{toast.title}</p>

          {toast.description ? (
            <p className="mt-1 text-sm leading-6 text-text-muted">
              {toast.description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded-full p-1.5 text-text-muted transition hover:bg-background hover:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close notification"
        >
          <X aria-hidden="true" size={18} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
