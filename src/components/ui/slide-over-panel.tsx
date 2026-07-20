"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type SlideOverPanelProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SlideOverPanel({
  open,
  title,
  description,
  onClose,
  children,
  className,
  contentClassName,
}: SlideOverPanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-text-strong/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "absolute inset-0 flex h-full w-full flex-col bg-white shadow-2xl sm:inset-y-3 sm:right-3 sm:left-auto sm:h-auto sm:max-h-[calc(100vh-1.5rem)] sm:w-[min(46rem,calc(100vw-1.5rem))] sm:rounded-3xl",
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-soft px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-black tracking-tight text-text-strong"
            >
              {title}
            </h2>

            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm font-semibold leading-6 text-text-muted"
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-soft bg-white text-text-muted transition hover:bg-background hover:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X aria-hidden="true" size={20} strokeWidth={2.6} />
          </button>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
