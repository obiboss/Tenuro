"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type PhoneNumberInputProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
};

function cleanVisiblePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("234")) {
    return digits.slice(3).replace(/^0+/, "").slice(0, 10);
  }

  if (digits.startsWith("0")) {
    return digits.slice(1).slice(0, 10);
  }

  return digits.slice(0, 10);
}

function toLegacyLocalSubmission(value: string) {
  const cleaned = cleanVisiblePhoneInput(value);

  if (!cleaned) {
    return "";
  }

  return `0${cleaned}`;
}

export function PhoneNumberInput({
  label,
  name,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
}: PhoneNumberInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const submittedValue = toLegacyLocalSubmission(value);

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-text-strong"
      >
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>

      <div
        className={cn(
          "flex h-14 overflow-hidden rounded-button border bg-white transition",
          "border-border-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
          error &&
            "border-danger focus-within:border-danger focus-within:ring-danger/15",
          disabled && "bg-surface",
        )}
      >
        <div className="flex min-w-20 items-center justify-center border-r border-border-soft bg-primary-soft px-4 text-base font-extrabold text-primary">
          +234
        </div>

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={value}
          disabled={disabled}
          required={required}
          placeholder="8012345678"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          onChange={(event) => {
            onChange(cleanVisiblePhoneInput(event.target.value));
          }}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-base font-semibold text-text-strong outline-none placeholder:text-text-muted/70 disabled:cursor-not-allowed disabled:text-text-muted"
        />
      </div>

      <input type="hidden" name={name} value={submittedValue} />

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
