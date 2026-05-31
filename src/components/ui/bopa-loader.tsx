import { cn } from "@/lib/cn";

type BopaLoaderProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: {
    wrapper: "size-10",
    logo: "size-7 text-sm",
    ring: "size-10",
    dot: "size-2",
  },
  md: {
    wrapper: "size-14",
    logo: "size-10 text-lg",
    ring: "size-14",
    dot: "size-2.5",
  },
  lg: {
    wrapper: "size-20",
    logo: "size-14 text-2xl",
    ring: "size-20",
    dot: "size-3",
  },
};

export function BopaLoader({
  label = "Loading securely...",
  size = "md",
  fullScreen = false,
  className,
}: BopaLoaderProps) {
  const classes = sizeClasses[size];

  const loader = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center",
          classes.wrapper,
        )}
      >
        <div
          className={cn(
            "absolute rounded-full border-2 border-primary/10 border-t-primary border-r-gold-deep",
            "animate-spin",
            classes.ring,
          )}
        />

        <div
          className={cn(
            "absolute -right-0.5 top-2 rounded-full bg-gold-deep shadow-soft",
            "animate-pulse",
            classes.dot,
          )}
        />

        <div
          className={cn(
            "relative flex items-center justify-center rounded-2xl bg-primary font-black tracking-tight text-white shadow-card",
            classes.logo,
          )}
        >
          B
        </div>
      </div>

      {label ? (
        <p className="text-center text-sm font-bold text-text-muted">{label}</p>
      ) : null}
    </div>
  );

  if (!fullScreen) {
    return loader;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      {loader}
    </main>
  );
}
