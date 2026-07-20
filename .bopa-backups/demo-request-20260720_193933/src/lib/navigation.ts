import {
  Building2,
  ClipboardList,
  CreditCard,
  History,
  Home,
  LayoutDashboard,
  ReceiptText,
  RefreshCcw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
  Users,
} from "lucide-react";

type PlatformAdminNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  status: "available" | "coming_soon";
};

export const LANDLORD_NAVIGATION = [
  {
    label: "Overview",
    href: "/overview",
    icon: Home,
  },
  {
    label: "Properties",
    href: "/properties",
    icon: Building2,
  },
  {
    label: "Tenants",
    href: "/tenants",
    icon: Users,
  },
  {
    label: "Payments",
    href: "/payments",
    icon: ReceiptText,
  },
  {
    label: "Renewals",
    href: "/renewals",
    icon: RefreshCcw,
  },
  {
    label: "Activity",
    href: "/activity",
    icon: History,
  },
  {
    label: "Caretakers",
    href: "/caretakers",
    icon: ShieldCheck,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: ClipboardList,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

export const PLATFORM_ADMIN_NAVIGATION: readonly PlatformAdminNavigationItem[] =
  [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      status: "available",
    },
    {
      label: "Payment Operations",
      href: "/admin/payments",
      icon: ReceiptText,
      status: "available",
    },
    {
      label: "Payout Verifications",
      href: "/admin/payout-verifications",
      icon: CreditCard,
      status: "available",
    },
    {
      label: "Payment Settings",
      href: "/admin/payment-settings",
      icon: SlidersHorizontal,
      status: "available",
    },
  ];
