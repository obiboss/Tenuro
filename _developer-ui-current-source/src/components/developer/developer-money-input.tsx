"use client";

import { useId } from "react";
import {
  formatNairaInput,
  getNumericMoneyValue,
} from "@/lib/money/naira";

type DeveloperMoneyInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hiddenInputName: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
};

export function DeveloperMoneyInput({
  label,
  value,
  onChange,
  hiddenInputName,
  placeholder = "Example: ₦5,000,000",
  required = false,
  error,
}: DeveloperMoneyInputProps) {
  const inputId = useId();

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-text-strong"
      >
        {label}{" "}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>

      <input type="hidden" name={hiddenInputName} value={getNumericMoneyValue(value)} />

      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(formatNairaInput(event.target.value))}
        placeholder={placeholder}
        required={required}
        className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
      />

      {error ? (
        <p className="text-sm font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}
