import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "./badge";

type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "primary";
};

export function StatusPill({
  label,
  tone = "neutral",
  className,
  ...props
}: StatusPillProps) {
  return (
    <Badge tone={tone} className={cn("gap-2", className)} {...props}>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger",
          tone === "primary" && "bg-primary",
          tone === "neutral" && "bg-text-muted",
        )}
      />
      {label}
    </Badge>
  );
}
