import {
  Building2,
  ClipboardList,
  History,
  Home,
  ReceiptText,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

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
