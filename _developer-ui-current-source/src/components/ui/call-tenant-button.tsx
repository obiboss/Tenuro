"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type CallTenantButtonProps = {
  phoneNumber?: string | null;
  label?: string;
};

export function CallTenantButton({
  phoneNumber = null,
  label = "Call tenant",
}: CallTenantButtonProps) {
  const { showToast } = useToast();
  const trimmed = phoneNumber?.trim();

  if (!trimmed) {
    return (
      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={() =>
          showToast({
            title: "Phone number missing",
            description: "Tenant phone number is missing.",
            tone: "error",
          })
        }
      >
        <Phone aria-hidden="true" size={16} strokeWidth={2.6} />
        {label}
      </Button>
    );
  }

  return (
    <a href={`tel:${trimmed}`} className="block">
      <Button type="button" variant="secondary" fullWidth>
        <Phone aria-hidden="true" size={16} strokeWidth={2.6} />
        {label}
      </Button>
    </a>
  );
}
