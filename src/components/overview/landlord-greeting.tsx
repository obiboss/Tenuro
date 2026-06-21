"use client";

import { useSyncExternalStore } from "react";

type LandlordGreetingProps = {
  landlordName: string;
};

function getGreetingPrefix(hour: number) {
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  }

  if (hour >= 17 && hour < 21) {
    return "Good evening";
  }

  return "Welcome back";
}

function subscribeToGreeting() {
  return () => {};
}

function getClientGreetingPrefix() {
  return getGreetingPrefix(new Date().getHours());
}

function getServerGreetingPrefix() {
  return "Welcome back";
}

export function LandlordGreeting({ landlordName }: LandlordGreetingProps) {
  const greetingPrefix = useSyncExternalStore(
    subscribeToGreeting,
    getClientGreetingPrefix,
    getServerGreetingPrefix,
  );

  return (
    <div>
      <p className="text-sm font-semibold text-text-muted">
        {greetingPrefix}, {landlordName}
      </p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-text-strong md:text-3xl">
        Rent control
      </h1>
    </div>
  );
}
