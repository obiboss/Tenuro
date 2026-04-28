import { cn } from "@/lib/cn";

type LoadingStateProps = {
  rows?: number;
  className?: string;
  label?: string;
};

export function LoadingState({
  rows = 3,
  className,
  label = "Preparing your records...",
}: LoadingStateProps) {
  return (
    <div className={cn("space-y-4", className)} aria-live="polite">
      <p className="sr-only">{label}</p>

      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-card bg-white/75 shadow-soft"
        />
      ))}
    </div>
  );
}
