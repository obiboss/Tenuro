"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type OtpCodeInputProps = {
  name: string;
  label: string;
  error?: string;
  helperText?: string;
};

const OTP_LENGTH = 6;

export function OtpCodeInput({
  name,
  label,
  error,
  helperText,
}: OtpCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const value = useMemo(() => digits.join(""), [digits]);

  function updateDigit(index: number, nextValue: string) {
    const digit = nextValue.replace(/\D/g, "").slice(-1);

    setDigits((currentDigits) => {
      const updatedDigits = [...currentDigits];
      updatedDigits[index] = digit;
      return updatedDigits;
    });

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(text: string) {
    const pastedDigits = text.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");

    if (pastedDigits.length === 0) {
      return;
    }

    setDigits(() => {
      const updatedDigits = Array(OTP_LENGTH).fill("");

      pastedDigits.forEach((digit, index) => {
        updatedDigits[index] = digit;
      });

      return updatedDigits;
    });

    const nextFocusIndex = Math.min(pastedDigits.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocusIndex]?.focus();
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-text-strong">
        {label}
      </label>

      <input type="hidden" name={name} value={value} />

      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            aria-label={`OTP digit ${index + 1}`}
            onChange={(event) => updateDigit(index, event.target.value)}
            onPaste={(event) => {
              event.preventDefault();
              handlePaste(event.clipboardData.getData("text"));
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
              }
            }}
            className={cn(
              "h-[60px] rounded-2xl border bg-white text-center text-2xl font-extrabold text-text-strong outline-none transition",
              "border-border-soft focus:border-primary focus:ring-2 focus:ring-primary/15",
              error && "border-danger focus:border-danger focus:ring-danger/15",
            )}
          />
        ))}
      </div>

      {error ? (
        <p className="text-sm font-medium text-danger">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
