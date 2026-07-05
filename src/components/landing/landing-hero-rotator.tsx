"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CreditCard,
  Landmark,
  LayoutGrid,
  ReceiptText,
  ShieldCheck,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type HeroSlideKey = "landlord" | "developer" | "manager";

const heroSlides = [
  {
    key: "landlord",
    navLabel: "Landlords",
    pill: "Built for Nigerian landlords",
    title: "Manage tenants, rent payments, and receipts without confusion.",
    description:
      "BOPA helps landlords keep proper rental records, track who has paid, know who is owing, and send clear receipts without relying on notebooks or scattered WhatsApp messages.",
    primaryLabel: "Sign up as Landlord",
    primaryHref: "/register?role=landlord",
    secondaryLabel: "Generate Rent Receipt",
    secondaryHref: "/receipt-generator",
  },
  {
    key: "developer",
    navLabel: "Developers",
    pill: "For real estate developers",
    title: "Sell plots, track buyers, and manage estate payments clearly.",
    description:
      "BOPA Developer helps estate companies manage plots, buyer onboarding, installment payments, allocation letters, receipts, and buyer records from one clean workspace.",
    primaryLabel: "Explore Developer Tools",
    primaryHref: "/developers",
    secondaryLabel: "Sign up as Developer",
    secondaryHref: "/developer/register",
  },
  {
    key: "manager",
    navLabel: "Property Managers",
    pill: "For structured property managers",
    title:
      "Manage landlords, tenants, rent collection, and remittances clearly.",
    description:
      "BOPA Manager helps property management firms organise landlord clients, tenant records, rent payments, maintenance issues, receipts, reports, staff access, and landlord remittances from one clean workspace.",
    primaryLabel: "Explore Manager Tools",
    primaryHref: "/managers",
    secondaryLabel: "Create Manager Account",
    secondaryHref: "/manager/register",
  },
] as const;

function LandlordMockup() {
  return (
    <div className="rounded-4xl bg-surface p-5 shadow-card md:p-6">
      <div className="rounded-3xl bg-background p-5">
        <div className="grid gap-4">
          <div className="rounded-card border border-border-soft bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Building2 size={22} strokeWidth={2.6} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Total Units
                </p>
                <p className="text-2xl font-black text-text-strong">24</p>
                <p className="text-xs font-semibold text-text-muted">
                  Across 4 properties
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border-soft bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-success/15 text-success">
                <Users size={22} strokeWidth={2.6} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Tenants
                </p>
                <p className="text-2xl font-black text-text-strong">21</p>
                <p className="text-xs font-semibold text-text-muted">
                  Active rental records
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border-soft bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-warning/15 text-warning">
                <ReceiptText size={22} strokeWidth={2.6} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Rent Collected
                </p>
                <p className="text-2xl font-black text-text-strong">₦18.6M</p>
                <p className="text-xs font-semibold text-text-muted">
                  Track annual rent payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function DeveloperMockup() {
  return (
    <div className="developer-hero-scene relative min-h-107.5">
      <div className="developer-float-card absolute left-0 top-4 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Landmark aria-hidden="true" size={19} strokeWidth={2.7} />
          </span>
          <span>
            <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
              Estate
            </span>
            <span className="block text-base font-black text-text-strong">
              Green Valley
            </span>
          </span>
        </div>
      </div>

      <div className="developer-float-card absolute right-0 top-16 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CreditCard aria-hidden="true" size={19} strokeWidth={2.7} />
          </span>
          <span>
            <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
              Due
            </span>
            <span className="block text-base font-black text-text-strong">
              ₦18.4M
            </span>
          </span>
        </div>
      </div>

      <div className="developer-tilt-card absolute inset-x-4 top-20 mx-auto max-w-md rounded-4xl border border-white/80 bg-white p-5 shadow-2xl">
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

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-background p-3">
            <p className="text-xs font-bold text-text-muted">Plots</p>
            <p className="mt-1 text-xl font-black text-text-strong">120</p>
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
            <p className="text-sm font-black text-text-strong">Plot map</p>
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
              Buyers view payments, balances, and receipts.
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

      <div className="developer-orb developer-orb-one" />
      <div className="developer-orb developer-orb-two" />
    </div>
  );
}

function ManagerMockup() {
  return (
    <div className="developer-hero-scene relative min-h-107.5">
      <div className="developer-float-card absolute left-0 top-4 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Building2 aria-hidden="true" size={19} strokeWidth={2.7} />
          </span>
          <span>
            <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
              Landlords
            </span>
            <span className="block text-base font-black text-text-strong">
              38 Clients
            </span>
          </span>
        </div>
      </div>

      <div className="developer-float-card absolute right-0 top-16 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-success/15 text-success">
            <WalletCards aria-hidden="true" size={19} strokeWidth={2.7} />
          </span>
          <span>
            <span className="block text-xs font-black uppercase tracking-wide text-text-muted">
              Remit
            </span>
            <span className="block text-base font-black text-text-strong">
              ₦42.8M
            </span>
          </span>
        </div>
      </div>

      <div className="developer-tilt-card absolute inset-x-4 top-20 mx-auto max-w-md rounded-4xl border border-white/80 bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Manager workspace
            </p>
            <h3 className="mt-1 text-xl font-black text-text-strong">
              Prime Estates Management
            </h3>
          </div>

          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary">
            Active
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-background p-3">
            <p className="text-xs font-bold text-text-muted">Properties</p>
            <p className="mt-1 text-xl font-black text-text-strong">84</p>
          </div>
          <div className="rounded-2xl bg-background p-3">
            <p className="text-xs font-bold text-text-muted">Tenants</p>
            <p className="mt-1 text-xl font-black text-text-strong">312</p>
          </div>
          <div className="rounded-2xl bg-background p-3">
            <p className="text-xs font-bold text-text-muted">Staff</p>
            <p className="mt-1 text-xl font-black text-text-strong">12</p>
          </div>
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
            {[
              ["Rent collected", "₦58.2M"],
              ["Management fee", "₦5.8M"],
              ["Landlord balance", "₦42.8M"],
            ].map(([label, value]) => (
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
              <Wrench
                aria-hidden="true"
                size={18}
                strokeWidth={2.7}
                className="text-warning"
              />
              <p className="text-sm font-black text-text-strong">Maintenance</p>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
              Track reported repairs, costs, vendors, and resolution status.
            </p>
          </div>

          <div className="rounded-3xl border border-border-soft bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                size={18}
                strokeWidth={2.7}
                className="text-success"
              />
              <p className="text-sm font-black text-text-strong">Staff roles</p>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
              Give accountants, officers, and managers the right access.
            </p>
          </div>
        </div>
      </div>

      <div className="developer-orb developer-orb-one" />
      <div className="developer-orb developer-orb-two" />
    </div>
  );
}

function HeroVisual({ slideKey }: { slideKey: HeroSlideKey }) {
  if (slideKey === "developer") {
    return <DeveloperMockup />;
  }

  if (slideKey === "manager") {
    return <ManagerMockup />;
  }

  return <LandlordMockup />;
}

export function LandingHeroRotator() {
  const [activeKey, setActiveKey] = useState<HeroSlideKey>("landlord");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveKey((current) => {
        const currentIndex = heroSlides.findIndex(
          (slide) => slide.key === current,
        );
        const nextIndex = (currentIndex + 1) % heroSlides.length;

        return heroSlides[nextIndex]?.key ?? "landlord";
      });
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  const activeSlide = useMemo(
    () => heroSlides.find((slide) => slide.key === activeKey) ?? heroSlides[0],
    [activeKey],
  );

  return (
    <div className="grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
      <div className="relative min-h-153 sm:min-h-130 lg:min-h-120">
        {heroSlides.map((slide) => {
          const active = slide.key === activeSlide.key;

          return (
            <div
              key={slide.key}
              aria-hidden={!active}
              className={cn(
                "absolute inset-0 transition-all duration-700 ease-out",
                active
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-5 opacity-0",
              )}
            >
              <Badge tone="primary" size="md">
                {slide.pill}
              </Badge>

              <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl lg:text-6xl">
                {slide.title}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-text-muted md:text-lg">
                {slide.description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={slide.primaryHref} tabIndex={active ? 0 : -1}>
                  <Button type="button" fullWidth>
                    {slide.primaryLabel}
                    <ArrowRight
                      aria-hidden="true"
                      size={17}
                      strokeWidth={2.6}
                    />
                  </Button>
                </Link>

                <Link href={slide.secondaryHref} tabIndex={active ? 0 : -1}>
                  <Button type="button" variant="secondary" fullWidth>
                    {slide.secondaryLabel}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}

        <div className="absolute bottom-0 left-0 right-0">
          <div className="flex flex-wrap gap-2">
            {heroSlides.map((slide) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => setActiveKey(slide.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-black transition duration-300",
                  activeKey === slide.key
                    ? "bg-primary text-white shadow-soft"
                    : "bg-white text-text-muted hover:bg-primary-soft hover:text-primary",
                )}
              >
                {slide.navLabel}
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-card border border-border-soft bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
              </div>
              <div>
                <p className="font-black text-text-strong">
                  Built for cleaner property records
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  Track payments, buyers, tenants, documents, and actions with
                  better accountability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative min-h-107.5">
        {heroSlides.map((slide) => {
          const active = slide.key === activeSlide.key;

          return (
            <div
              key={`${slide.key}-visual`}
              aria-hidden={!active}
              className={cn(
                "absolute inset-0 transition-all duration-700 ease-out",
                active
                  ? "pointer-events-auto scale-100 opacity-100"
                  : "pointer-events-none scale-[0.97] opacity-0",
              )}
            >
              <HeroVisual slideKey={slide.key} />
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .developer-hero-scene {
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
    </div>
  );
}
