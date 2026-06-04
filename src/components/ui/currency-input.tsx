"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type CurrencyInputProps = {
  label: string;
  name: string;
  defaultValue?: number | string | null;
  value?: number | string | null;
  resetKey?: number;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  onValueChange?: (value: string) => void;
};

function normaliseCurrencyValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return value
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "")
    .trim();
}

function sanitiseCurrencyValue(value: string) {
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

function formatCurrencyForDisplay(value: string) {
  if (!value) {
    return "";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "";
  }

  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function CurrencyInputField({
  label,
  name,
  defaultValue,
  value,
  helperText,
  error,
  required = false,
  disabled = false,
  placeholder = "0.00",
  id,
  onValueChange,
}: Omit<CurrencyInputProps, "resetKey">) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const isControlled = value !== undefined;

  const initialUncontrolledValue = useMemo(
    () => normaliseCurrencyValue(defaultValue),
    [defaultValue],
  );

  const [uncontrolledRawValue, setUncontrolledRawValue] = useState(
    initialUncontrolledValue,
  );
  const [isFocused, setIsFocused] = useState(false);

  const rawValue = isControlled
    ? normaliseCurrencyValue(value)
    : uncontrolledRawValue;

  const displayValue = isFocused
    ? rawValue
    : rawValue
      ? formatCurrencyForDisplay(rawValue)
      : "";

  function handleValueChange(nextValue: string) {
    const sanitisedValue = sanitiseCurrencyValue(nextValue);

    if (!isControlled) {
      setUncontrolledRawValue(sanitisedValue);
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
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[1.75rem] font-semibold leading-none text-text-muted">
          ₦
        </span>

        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={displayValue}
          placeholder={placeholder}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          onFocus={() => {
            setIsFocused(true);
          }}
          onChange={(event) => {
            handleValueChange(event.target.value);
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          className={cn(
            "flex h-14 w-full rounded-button border bg-white pl-14 pr-4 text-base font-medium text-text-strong outline-none transition placeholder:text-text-muted/70",
            "border-border-soft focus:border-primary focus:ring-2 focus:ring-primary/15",
            "disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted",
            error && "border-danger focus:border-danger focus:ring-danger/15",
          )}
        />

        <input type="hidden" name={name} value={rawValue} />
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

export function CurrencyInput({ resetKey = 0, ...props }: CurrencyInputProps) {
  return <CurrencyInputField key={resetKey} {...props} />;
}
