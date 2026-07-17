import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn("p-0", className)}>
      <div className="flex flex-col gap-4 border-b border-border-soft px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-text-strong">
            {title}
          </h2>

          {description ? (
            <p className="mt-1 text-sm leading-6 text-text-muted">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn("p-5 md:p-6", contentClassName)}>{children}</div>
    </Card>
  );
}
