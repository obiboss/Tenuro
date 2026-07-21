"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Toast, type ToastItem, type ToastTone } from "@/components/ui/toast";
import {
  OFFLINE_SAVED_EVENT,
  type OfflineSavedEventDetail,
} from "@/lib/offline/offline-save-notification";

type ShowToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  showToast: (input: ShowToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  const showToast = useCallback(
    ({ title, description, tone = "info" }: ShowToastInput) => {
      const id = createToastId();

      setToasts((currentToasts) => [
        {
          id,
          title,
          description,
          tone,
        },
        ...currentToasts.slice(0, 2),
      ]);

      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast],
  );

  useEffect(() => {
    const handleOfflineSaved = (event: Event) => {
      const detail = (event as CustomEvent<OfflineSavedEventDetail>).detail;

      if (!detail?.message) {
        return;
      }

      showToast({
        title: "Saved offline",
        description: detail.message,
        tone: "success",
      });
    };

    window.addEventListener(OFFLINE_SAVED_EVENT, handleOfflineSaved);

    return () => {
      window.removeEventListener(OFFLINE_SAVED_EVENT, handleOfflineSaved);
    };
  }, [showToast]);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-4 top-4 z-80 flex flex-col gap-3 sm:left-auto sm:right-6 sm:w-full sm:max-w-md">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
