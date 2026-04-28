"use client";

import { useState } from "react";
import { EmailLoginForm } from "@/components/auth/email-login-form";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

export function EmailFallbackPanel() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-sm font-bold text-primary hover:text-primary-hover"
        >
          Sign in with email instead →
        </button>
      </div>
    );
  }

  return (
    <SectionCard
      title="Email fallback"
      description="Use this only if your account was created with email."
      action={
        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
          Hide
        </Button>
      }
    >
      <div className="space-y-5">
        <EmailLoginForm />
        <MagicLinkForm />
      </div>
    </SectionCard>
  );
}
