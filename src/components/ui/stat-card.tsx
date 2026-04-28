import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

type StatTone = "primary" | "success" | "warning" | "danger" | "gold";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon: ReactNode;
  tone?: StatTone;
  className?: string;
};

const tones: Record<StatTone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  gold: "bg-gold-soft text-gold-deep",
};

export function StatCard({
  title,
  value,
  description,
  icon,
  tone = "primary",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-muted">{title}</p>

          <p className="mt-2 truncate text-2xl font-extrabold tracking-tight text-text-strong">
            {value}
          </p>

          {description ? (
            <p className="mt-2 text-sm leading-5 text-text-muted">
              {description}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl",
            tones[tone],
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
