import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
};

export function Select({
  label,
  options,
  error,
  helperText,
  placeholder = "Select an option",
  id,
  name,
  className,
  required,
  ...props
}: SelectProps) {
  const selectId = id ?? name;
  const errorId = selectId ? `${selectId}-error` : undefined;
  const helperId = selectId ? `${selectId}-helper` : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={selectId}
        className="block text-sm font-semibold text-text-strong"
      >
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>

      <select
        id={selectId}
        name={name}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={cn(
          "min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted",
          error && "border-danger focus:border-danger focus:ring-danger-soft",
          className,
        )}
        {...props}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

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
