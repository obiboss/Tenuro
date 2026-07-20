"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
};

export function Input({
  label,
  error,
  helperText,
  id,
  name,
  className,
  required,
  type = "text",
  disabled,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputId = id ?? name;
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;
  const isPasswordInput = type === "password";
  const resolvedType = isPasswordInput && isPasswordVisible ? "text" : type;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-text-strong"
      >
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>

      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={resolvedType}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted",
            isPasswordInput && "pr-14",
            error && "border-danger focus:border-danger focus:ring-danger-soft",
            className,
          )}
          {...props}
        />

        {isPasswordInput ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            aria-pressed={isPasswordVisible}
            title={isPasswordVisible ? "Hide password" : "Show password"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden="true" size={20} strokeWidth={2.4} />
            ) : (
              <Eye aria-hidden="true" size={20} strokeWidth={2.4} />
            )}
          </button>
        ) : null}
      </div>

      {helperText && !error ? (
        <p id={helperId} className="text-sm leading-5 text-text-muted">
          {helperText}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
