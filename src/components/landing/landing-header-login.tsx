"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { LoginRoleSelectionModal } from "@/components/landing/login-role-selection-modal";
import { Button } from "@/components/ui/button";

export function LandingHeaderLogin() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setLoginOpen(true)}>
        Login
        <LogIn aria-hidden="true" size={18} strokeWidth={2.6} />
      </Button>

      <LoginRoleSelectionModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
      />
    </>
  );
}
