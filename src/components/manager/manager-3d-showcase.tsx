"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  ReceiptText,
  ShieldCheck,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const statementRows = [
  ["Rent collected", "₦58.2M"],
  ["Manager fee", "₦5.8M"],
  ["Landlord balance", "₦42.8M"],
] as const;

const propertyCards = [
  {
    label: "Landlords",
    value: "38",
  },
  {
    label: "Properties",
    value: "84",
  },
  {
    label: "Tenants",
    value: "312",
  },
] as const;

export function Manager3DShowcase() {
  return (
    <section className="overflow-hidden rounded-4xl border border-border-soft bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative z-10">
          <p className="text-sm font-black uppercase tracking-wide text-primary">
            BOPA Manager
          </p>

          <h1 className="mt-4 max-w-xl text-4xl font-black tracking-tight text-text-strong md:text-5xl">
            One workspace for property managers handling many landlords.
          </h1>

          <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-text-muted md:text-lg">
            Manage landlord clients, tenants, rent collection, maintenance,
            staff roles, receipts, statements, and remittances from one clean
            property management workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/manager/register">
              <Button type="button" fullWidth>
                Create Manager Account
                <ArrowRight aria-hidden="true" size={17} strokeWidth={2.6} />
              </Button>
            </Link>

            <Link href="/contact">
              <Button type="button" variant="secondary" fullWidth>
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>

        <div className="manager-hero-scene relative min-h-125">
          <div className="manager-orb manager-orb-one" />
          <div className="manager-orb manager-orb-two" />

          <div className="manager-float-card absolute left-0 top-6 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Building2 aria-hidden="true" size={20} strokeWidth={2.7} />
              </span>

              <span>
                <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
                  Landlord clients
                </span>
                <span className="block text-base font-black text-text-strong">
                  38 Active
                </span>
              </span>
            </div>
          </div>

          <div className="manager-float-card absolute right-0 top-16 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-success/15 text-success">
                <WalletCards aria-hidden="true" size={20} strokeWidth={2.7} />
              </span>

              <span>
                <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
                  To remit
                </span>
                <span className="block text-base font-black text-text-strong">
                  ₦42.8M
                </span>
              </span>
            </div>
          </div>

          <div className="manager-tilt-card absolute inset-x-4 top-20 mx-auto max-w-lg rounded-4xl border border-white/80 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Manager workspace
                </p>
                <h3 className="mt-1 text-xl font-black text-text-strong">
                  Prime Estates Management
                </h3>
              </div>

              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary">
                Live
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {propertyCards.map((item) => (
                <div key={item.label} className="rounded-2xl bg-background p-3">
                  <p className="text-xs font-bold text-text-muted">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-black text-text-strong">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-border-soft bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-text-strong">
                  Landlord statement
                </p>

                <ReceiptText
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2.7}
                  className="text-primary"
                />
              </div>

              <div className="space-y-3">
                {statementRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl bg-background px-4 py-3"
                  >
                    <span className="text-xs font-bold text-text-muted">
                      {label}
                    </span>
                    <span className="text-sm font-black text-text-strong">
                      {value}
                    </span>
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
                    Tenant records
                  </p>
                </div>

                <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
                  Track rent, balances, due dates, and receipts.
                </p>
              </div>

              <div className="rounded-3xl border border-border-soft bg-white p-4">
                <div className="flex items-center gap-2">
                  <Wrench
                    aria-hidden="true"
                    size={18}
                    strokeWidth={2.7}
                    className="text-warning"
                  />
                  <p className="text-sm font-black text-text-strong">
                    Maintenance
                  </p>
                </div>

                <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
                  Track repairs, vendors, costs, and status.
                </p>
              </div>
            </div>
          </div>

          <div className="manager-float-card absolute bottom-4 left-8 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-success/15 text-success">
                <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.7} />
              </span>

              <span>
                <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
                  Staff roles
                </span>
                <span className="block text-base font-black text-text-strong">
                  Controlled access
                </span>
              </span>
            </div>
          </div>

          <div className="manager-float-card absolute bottom-10 right-4 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ClipboardList aria-hidden="true" size={20} strokeWidth={2.7} />
              </span>

              <span>
                <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
                  Reports
                </span>
                <span className="block text-base font-black text-text-strong">
                  Ready to send
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .manager-hero-scene {
          perspective: 1200px;
        }

        .manager-tilt-card {
          transform: rotateX(8deg) rotateY(-12deg) rotateZ(1deg);
          transform-style: preserve-3d;
          animation: manager-card-float 7s ease-in-out infinite;
        }

        .manager-float-card {
          animation: manager-float 6s ease-in-out infinite;
        }

        .manager-float-card:nth-of-type(3) {
          animation-delay: 0.7s;
        }

        .manager-float-card:nth-of-type(5) {
          animation-delay: 1.1s;
        }

        .manager-float-card:nth-of-type(6) {
          animation-delay: 1.5s;
        }

        .manager-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(2px);
          opacity: 0.38;
          pointer-events: none;
        }

        .manager-orb-one {
          width: 190px;
          height: 190px;
          right: 12%;
          bottom: 18%;
          background: rgb(37 99 235 / 0.28);
          animation: manager-orb-drift 9s ease-in-out infinite;
        }

        .manager-orb-two {
          width: 130px;
          height: 130px;
          left: 12%;
          top: 20%;
          background: rgb(34 197 94 / 0.24);
          animation: manager-orb-drift 11s ease-in-out infinite reverse;
        }

        @keyframes manager-card-float {
          0%,
          100% {
            transform: rotateX(8deg) rotateY(-12deg) rotateZ(1deg) translateY(0);
          }
          50% {
            transform: rotateX(5deg) rotateY(-8deg) rotateZ(0deg)
              translateY(-14px);
          }
        }

        @keyframes manager-float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.02);
          }
        }

        @keyframes manager-orb-drift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(18px, -22px, 0) scale(1.12);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .manager-tilt-card,
          .manager-float-card,
          .manager-orb {
            animation: none;
          }
        }

        @media (max-width: 640px) {
          .manager-tilt-card {
            transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }

          @keyframes manager-card-float {
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
