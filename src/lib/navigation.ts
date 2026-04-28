import {
  Building2,
  ClipboardList,
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
