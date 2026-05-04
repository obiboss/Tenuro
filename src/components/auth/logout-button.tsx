"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth.actions";
import { cn } from "@/lib/cn";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={cn(
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-extrabold text-text-strong shadow-soft transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
      >
        <LogOut aria-hidden="true" size={16} strokeWidth={2.6} />
        Sign out
      </button>
    </form>
  );
}
