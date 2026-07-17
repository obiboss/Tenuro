import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BopaLoaderIcon } from "@/components/ui/bopa-loader";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-soft hover:bg-primary-hover focus-visible:ring-primary disabled:bg-primary/40 disabled:text-white",
  secondary:
    "bg-surface text-text-strong shadow-soft ring-1 ring-border-soft hover:bg-primary-soft focus-visible:ring-primary disabled:bg-surface disabled:text-text-muted disabled:ring-border-soft",
  danger:
    "bg-danger text-white shadow-soft hover:bg-red-700 focus-visible:ring-danger disabled:bg-danger/40 disabled:text-white",
  ghost:
    "bg-transparent text-text-normal hover:bg-primary-soft focus-visible:ring-primary disabled:text-text-muted disabled:hover:bg-transparent",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  disabled,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-button font-semibold transition duration-200 disabled:cursor-not-allowed disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {isLoading ? <BopaLoaderIcon /> : null}

      <span>{children}</span>
    </button>
  );
}
