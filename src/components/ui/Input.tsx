import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const fieldClass =
  "w-full h-10 rounded-xl border border-bg-surface px-3 text-sm text-info outline-none transition-colors placeholder:text-info dark:placeholder:text-fg focus:border-green-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-bg-surface">
          {label}
        </span>
      )}

      <input
        {...props}
        className={`${fieldClass} ${error ? "border-danger" : ""} ${className}`}
      />

      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-bg-surface">
          {label}
        </span>
      )}

      <select {...props} className={`${fieldClass} ${className}`}>
        {children}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-bg-surface">
          {label}
        </span>
      )}

      <textarea
        {...props}
        className={`min-h-24 w-full rounded-xl border border-bg-muted bg-bg-base dark:bg-bg-surface px-3 py-2 text-sm text-bg-surface outline-none transition-colors placeholder:text-bg-surface focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-danger" : ""
        } ${className}`}
      />

      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
