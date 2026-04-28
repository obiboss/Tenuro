import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

type TrustNoticeProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
};

export function TrustNotice({
  title,
  description,
  icon,
  className,
}: TrustNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-primary-soft p-4 text-primary shadow-soft",
        className,
      )}
    >
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary">
          {icon ?? (
            <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.5} />
          )}
        </div>

        <div>
          <p className="font-bold text-text-strong">{title}</p>
          <p className="mt-1 text-sm leading-6 text-text-normal">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
