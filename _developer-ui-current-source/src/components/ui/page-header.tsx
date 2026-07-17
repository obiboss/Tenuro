import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
  className?: string;
  compact?: boolean;
};

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        compact
          ? "mb-3 flex flex-col gap-3 md:mb-5 md:flex-row md:items-center md:justify-between"
          : "mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
            {eyebrow}
          </p>
        ) : null}

        <h1
          className={cn(
            "font-extrabold tracking-tight text-text-strong",
            compact ? "text-lg md:text-2xl" : "text-2xl md:text-3xl",
          )}
        >
          {title}
        </h1>

        {description ? (
          <p
            className={cn(
              "max-w-2xl leading-5 text-text-muted",
              compact
                ? "mt-1 text-xs md:text-sm"
                : "mt-2 text-sm md:text-base md:leading-6",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
