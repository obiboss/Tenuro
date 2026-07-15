import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  getManagerOverview,
  getManagerOrganizationForCurrentUser,
  type ManagerOverviewAttentionTone,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

const toneClasses: Record<
  ManagerOverviewAttentionTone,
  {
    border: string;
    text: string;
    background: string;
  }
> = {
  danger: {
    border: "border-danger/30",
    text: "text-danger",
    background: "bg-danger-soft",
  },
  warning: {
    border: "border-warning/30",
    text: "text-warning",
    background: "bg-warning-soft",
  },
  neutral: {
    border: "border-border-soft",
    text: "text-text-muted",
    background: "bg-surface",
  },
};

const numberFormatter = new Intl.NumberFormat("en-NG");

export default async function ManagerAttentionPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const overview = await getManagerOverview(supabase, organization.id);

  if (!overview) {
    redirect("/manager/onboarding");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/manager/overview"
            prefetch={false}
            className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
          >
            Back to overview
          </Link>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-text-strong">
            Needs attention{" "}
            {numberFormatter.format(overview.attentionItems.length)}
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Highest-priority manager tasks first.
          </p>
        </div>

        <CircleAlert className="size-6 text-text-muted" aria-hidden="true" />
      </div>

      <section className="rounded-card border border-border-soft bg-white shadow-sm">
        {overview.attentionItems.length > 0 ? (
          <ul className="divide-y divide-border-soft">
            {overview.attentionItems.map((item) => {
              const classes = toneClasses[item.tone];

              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          item.tone === "danger"
                            ? "bg-danger"
                            : item.tone === "warning"
                              ? "bg-warning"
                              : "bg-text-muted",
                        )}
                        aria-hidden="true"
                      />
                      <p className="text-sm font-extrabold text-text-strong">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-text-normal">
                      {item.subject}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-text-muted">
                      {item.detail}
                    </p>
                  </div>

                  <Link
                    href={item.action.href}
                    prefetch={false}
                    className={cn(
                      "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      classes.border,
                      classes.background,
                      classes.text,
                    )}
                  >
                    {item.action.label}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-5">
            <p className="text-sm font-semibold text-text-muted">
              Nothing needs your attention right now.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
