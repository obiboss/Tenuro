"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type PercentageInputProps = {
  label: string;
  name: string;
  defaultValue?: number | string | null;
  value?: number | string | null;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  onValueChange?: (value: string) => void;
};

function normalisePercentageValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return value
    .replace(/%/g, "")
    .replace(/[^\d.]/g, "")
    .trim();
}

function sanitisePercentageValue(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const firstDotIndex = cleaned.indexOf(".");

  if (firstDotIndex === -1) {
    return cleaned;
  }

  const whole = cleaned.slice(0, firstDotIndex);
  const decimals = cleaned
    .slice(firstDotIndex + 1)
    .replace(/\./g, "")
    .slice(0, 2);

  return `${whole}.${decimals}`;
}

export function PercentageInput({
  label,
  name,
  defaultValue,
  value,
  helperText,
  error,
  required = false,
  disabled = false,
  placeholder = "10",
  id,
  onValueChange,
}: PercentageInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const isControlled = value !== undefined;

  const initialValue = useMemo(
    () => normalisePercentageValue(defaultValue),
    [defaultValue],
  );

  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);

  const inputValue = isControlled
    ? normalisePercentageValue(value)
    : uncontrolledValue;

  function handleChange(nextValue: string) {
    const sanitisedValue = sanitisePercentageValue(nextValue);

    if (!isControlled) {
      setUncontrolledValue(sanitisedValue);
    }

    onValueChange?.(sanitisedValue);
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-text-strong"
      >
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>

      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={inputValue}
          placeholder={placeholder}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          onChange={(event) => handleChange(event.target.value)}
          className={cn(
            "flex h-14 w-full rounded-button border bg-white px-4 pr-12 text-base font-medium text-text-strong outline-none transition placeholder:text-text-muted/70",
            "border-border-soft focus:border-primary focus:ring-2 focus:ring-primary/15",
            "disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted",
            error && "border-danger focus:border-danger focus:ring-danger/15",
          )}
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-black text-text-muted">
          %
        </span>
      </div>

      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-sm text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
