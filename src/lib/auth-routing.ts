import type { UserRole } from "@/server/types/auth.types";

export function getHomePathForRole(role: UserRole) {
  if (role === "platform_admin") {
    return "/admin";
  }

  if (role === "tenant") {
    return "/tenant";
  }

  if (role === "agent") {
    return "/agent/overview";
  }

  if (role === "caretaker") {
    return "/caretaker/overview";
  }

  if (role === "developer") {
    return "/developer";
  }

  if (role === "manager") {
    return "/manager";
  }

  return "/overview";
}
