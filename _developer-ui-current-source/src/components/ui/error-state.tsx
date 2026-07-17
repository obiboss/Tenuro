import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "We could not load this page.",
  description = "Please try again.",
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-card bg-surface p-8 text-center shadow-card"
    >
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.5} />
      </div>

      <h3 className="text-lg font-bold text-text-strong">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
        {description}
      </p>

      <div className="mt-6">
        {action ?? <Button variant="secondary">Try Again</Button>}
      </div>
    </div>
  );
}
