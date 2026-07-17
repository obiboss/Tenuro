import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "primary";
type BadgeSize = "sm" | "md";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
};

const tones: Record<BadgeTone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-background text-text-muted",
  primary: "bg-primary-soft text-primary",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function Badge({
  children,
  tone = "neutral",
  size = "sm",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full font-bold leading-none",
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
