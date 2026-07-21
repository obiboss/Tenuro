export const ACTIVITY_MODULES = [
  "auth",
  "landlord",
  "tenant",
  "caretaker",
  "agent",
  "manager",
  "developer",
  "payments",
  "subscriptions",
  "demo",
  "public_tools",
  "admin",
  "system",
] as const;

export const ACTIVITY_OUTCOMES = [
  "started",
  "in_progress",
  "succeeded",
  "failed",
  "cancelled",
  "informational",
] as const;

export const ACTIVITY_JOURNEY_STATUSES = [
  "in_progress",
  "completed",
  "failed",
  "cancelled",
] as const;

export type ActivityModule = (typeof ACTIVITY_MODULES)[number];
export type ActivityOutcome = (typeof ACTIVITY_OUTCOMES)[number];
export type ActivityJourneyStatus = (typeof ACTIVITY_JOURNEY_STATUSES)[number];
