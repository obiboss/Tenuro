"use client";

import { useSyncExternalStore } from "react";

type CaretakerGreetingProps = {
  caretakerName: string;
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

export function CaretakerGreeting({ caretakerName }: CaretakerGreetingProps) {
  const greetingPrefix = useSyncExternalStore(
    subscribeToGreeting,
    getClientGreetingPrefix,
    getServerGreetingPrefix,
  );

  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-text-muted">
        {greetingPrefix}, {caretakerName}
      </p>
      <h1 className="text-lg font-black tracking-tight text-text-strong">
        Caretaker workspace
      </h1>
    </div>
  );
}
