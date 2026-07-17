"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CreditCard,
  FileText,
  Landmark,
  LayoutGrid,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const plotItems = [
  { label: "A1", status: "sold" },
  { label: "A2", status: "available" },
  { label: "A3", status: "reserved" },
  { label: "B1", status: "sold" },
  { label: "B2", status: "available" },
  { label: "B3", status: "sold" },
  { label: "C1", status: "reserved" },
  { label: "C2", status: "available" },
  { label: "C3", status: "sold" },
] as const;

function FloatingStat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof LayoutGrid;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div
      className={`developer-float-card absolute rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon aria-hidden="true" size={19} strokeWidth={2.7} />
        </span>
        <span>
          <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
            {label}
          </span>
          <span className="block text-base font-black text-text-strong">
            {value}
          </span>
        </span>
      </div>
    </div>
  );
}

export function Developer3DShowcase() {
  return (
    <section className="overflow-hidden rounded-4xl border border-border-soft bg-linear-to-br from-white via-primary-soft/40 to-white p-5 shadow-soft md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-primary">
            BOPA Developer
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-strong md:text-5xl">
            One platform. Every estate. Complete control.
          </h2>

          <p className="mt-4 max-w-xl text-base font-semibold leading-8 text-text-muted">
            A professional control system for developers selling plots, managing
            installment buyers, coordinating sales teams, and tracking
            allocation documents.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/developers">
              <Button type="button" fullWidth>
                Explore Developer Tools
              </Button>
            </Link>

            <Link href="/developer/register">
              <Button type="button" variant="secondary" fullWidth>
                Sign up as Developer
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative min-h-107.5">
          <FloatingStat
            icon={Landmark}
            label="Estate"
            value="Green Valley"
            className="left-0 top-4 z-20"
          />
          <FloatingStat
            icon={CreditCard}
            label="Due"
            value="₦18.4M"
            className="right-0 top-16 z-20"
          />
          <FloatingStat
            icon={FileText}
            label="Documents"
            value="Ready"
            className="bottom-8 left-6 z-20"
          />

          <div className="developer-scene absolute inset-x-4 top-20 mx-auto max-w-md">
            <div className="developer-tilt-card rounded-4xl border border-white/80 bg-white p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Estate dashboard
                  </p>
                  <h3 className="mt-1 text-xl font-black text-text-strong">
                    Green Valley Estate
                  </h3>
                </div>

                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-black text-success">
                  Active
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-background p-3">
                  <p className="text-xs font-bold text-text-muted">Plots</p>
                  <p className="mt-1 text-xl font-black text-text-strong">
                    120
                  </p>
                </div>
                <div className="rounded-2xl bg-background p-3">
                  <p className="text-xs font-bold text-text-muted">Sold</p>
                  <p className="mt-1 text-xl font-black text-text-strong">48</p>
                </div>
                <div className="rounded-2xl bg-background p-3">
                  <p className="text-xs font-bold text-text-muted">Buyers</p>
                  <p className="mt-1 text-xl font-black text-text-strong">64</p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-border-soft bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-text-strong">
                    Plot map
                  </p>
                  <LayoutGrid
                    aria-hidden="true"
                    size={18}
                    strokeWidth={2.7}
                    className="text-primary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {plotItems.map((plot) => (
                    <div
                      key={plot.label}
                      className={cn(
                        "rounded-xl px-2 py-3 text-center text-xs font-black",
                        plot.status === "sold"
                          ? "bg-primary text-white"
                          : plot.status === "reserved"
                            ? "bg-warning/15 text-warning"
                            : "bg-success/15 text-success",
                      )}
                    >
                      {plot.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-border-soft bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Users
                      aria-hidden="true"
                      size={18}
                      strokeWidth={2.7}
                      className="text-primary"
                    />
                    <p className="text-sm font-black text-text-strong">
                      Buyer portal
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
                    Buyers view payment history, balance, and receipts.
                  </p>
                </div>

                <div className="rounded-3xl border border-border-soft bg-white p-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck
                      aria-hidden="true"
                      size={18}
                      strokeWidth={2.7}
                      className="text-success"
                    />
                    <p className="text-sm font-black text-text-strong">
                      Auto receipts
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
                    Receipts and allocation records stay organised.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="developer-orb developer-orb-one" />
          <div className="developer-orb developer-orb-two" />
        </div>
      </div>

      <style jsx>{`
        .developer-scene {
          perspective: 1200px;
        }

        .developer-tilt-card {
          transform: rotateX(9deg) rotateY(-13deg) rotateZ(1deg);
          transform-style: preserve-3d;
          animation: developer-card-float 7s ease-in-out infinite;
        }

        .developer-float-card {
          animation: developer-float 6s ease-in-out infinite;
        }

        .developer-float-card:nth-of-type(2) {
          animation-delay: 0.8s;
        }

        .developer-float-card:nth-of-type(3) {
          animation-delay: 1.4s;
        }

        .developer-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(2px);
          opacity: 0.35;
          pointer-events: none;
        }

        .developer-orb-one {
          width: 170px;
          height: 170px;
          right: 10%;
          bottom: 10%;
          background: rgb(37 99 235 / 0.3);
          animation: developer-orb-drift 9s ease-in-out infinite;
        }

        .developer-orb-two {
          width: 110px;
          height: 110px;
          left: 18%;
          top: 18%;
          background: rgb(34 197 94 / 0.22);
          animation: developer-orb-drift 11s ease-in-out infinite reverse;
        }

        @keyframes developer-card-float {
          0%,
          100% {
            transform: rotateX(9deg) rotateY(-13deg) rotateZ(1deg) translateY(0);
          }
          50% {
            transform: rotateX(6deg) rotateY(-9deg) rotateZ(0deg)
              translateY(-14px);
          }
        }

        @keyframes developer-float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.02);
          }
        }

        @keyframes developer-orb-drift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(18px, -22px, 0) scale(1.12);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .developer-tilt-card,
          .developer-float-card,
          .developer-orb {
            animation: none;
          }
        }

        @media (max-width: 640px) {
          .developer-tilt-card {
            transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }

          @keyframes developer-card-float {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-8px);
            }
          }
        }
      `}</style>
    </section>
  );
}
