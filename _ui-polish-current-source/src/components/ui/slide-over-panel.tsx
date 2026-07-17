"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type SlideOverPanelProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function SlideOverPanel({
  open,
  title,
  description,
  onClose,
  children,
  className,
}: SlideOverPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-panel-title"
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-4xl bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-lg sm:rounded-none sm:rounded-l-4xl",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-5">
          <div className="min-w-0">
            <h2
              id="slide-over-panel-title"
              className="text-lg font-extrabold text-text-strong"
            >
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-sm leading-6 text-text-muted">
                {description}
              </p>
            ) : null}
          </div>

          <Button type="button" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" size={20} strokeWidth={2.6} />
          </Button>
        </div>

        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
