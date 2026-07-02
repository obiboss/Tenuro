import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type BlogHeaderProps = {
  actionHref?: string;
  actionLabel?: string;
};

export function BlogHeader({
  actionHref = "/receipt-generator",
  actionLabel = "Generate Receipt",
}: BlogHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
          B
        </div>

        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold tracking-tight text-text-strong">
            Boldverse Property
          </p>
          <p className="truncate text-xs font-semibold text-text-muted">
            Property Management for Modern Landlords
          </p>
        </div>
      </Link>

      <Link href={actionHref} className="hidden sm:block">
        <Button variant="secondary">
          {actionLabel}
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} />
        </Button>
      </Link>
    </header>
  );
}
