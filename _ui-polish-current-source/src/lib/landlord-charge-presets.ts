import {
  Building2,
  ClipboardCheck,
  FileSignature,
  Hammer,
  PlusCircle,
  Scale,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type LandlordChargePreset = {
  id: string;
  name: string;
  description: string;
  defaultDescription: string;
  icon: LucideIcon;
  isRefundable: boolean;
  isRequiredBeforeMoveIn: boolean;
};

export const LANDLORD_CHARGE_PRESETS: LandlordChargePreset[] = [
  {
    id: "agreement_fee",
    name: "Agreement fee",
    description: "Tenancy agreement preparation fee",
    defaultDescription: "Fee for preparing and processing the tenancy agreement.",
    icon: FileSignature,
    isRefundable: false,
    isRequiredBeforeMoveIn: true,
  },
  {
    id: "caution_deposit",
    name: "Caution deposit",
    description: "Refundable security deposit",
    defaultDescription: "Refundable deposit held for the duration of the tenancy.",
    icon: Shield,
    isRefundable: true,
    isRequiredBeforeMoveIn: true,
  },
  {
    id: "damages_deposit",
    name: "Damages deposit",
    description: "Cover for property damage",
    defaultDescription: "Deposit to cover potential damages beyond normal wear and tear.",
    icon: Hammer,
    isRefundable: true,
    isRequiredBeforeMoveIn: true,
  },
  {
    id: "service_charge",
    name: "Service charge",
    description: "Estate or building services",
    defaultDescription: "Charge for shared services, maintenance, or estate dues.",
    icon: Building2,
    isRefundable: false,
    isRequiredBeforeMoveIn: true,
  },
  {
    id: "legal_fee",
    name: "Legal fee",
    description: "Legal documentation costs",
    defaultDescription: "Legal review or documentation fee for this tenancy.",
    icon: Scale,
    isRefundable: false,
    isRequiredBeforeMoveIn: true,
  },
  {
    id: "documentation_fee",
    name: "Documentation fee",
    description: "ID and paperwork processing",
    defaultDescription: "Fee for tenant documentation and onboarding paperwork.",
    icon: ClipboardCheck,
    isRefundable: false,
    isRequiredBeforeMoveIn: true,
  },
  {
    id: "other",
    name: "Other charge",
    description: "Custom landlord charge",
    defaultDescription: "",
    icon: PlusCircle,
    isRefundable: false,
    isRequiredBeforeMoveIn: true,
  },
];

export function getLandlordChargePresetById(id: string) {
  return LANDLORD_CHARGE_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function getLandlordChargePresetForName(chargeName: string) {
  const normalizedName = chargeName.trim().toLowerCase();

  return (
    LANDLORD_CHARGE_PRESETS.find(
      (preset) => preset.name.toLowerCase() === normalizedName,
    ) ?? null
  );
}

export function getLandlordChargePresetIcon(chargeName: string): LucideIcon {
  return getLandlordChargePresetForName(chargeName)?.icon ?? PlusCircle;
}
