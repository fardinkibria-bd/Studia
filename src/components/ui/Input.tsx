import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

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
  'w-full h-10 rounded-xl border border-border-default bg-bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60';

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">
          {label}
        </span>
      )}

      <input
        {...props}
        className={`${fieldClass} ${error ? 'border-danger' : ''} ${className}`}
      />

      {error && (
        <span className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">
          {label}
        </span>
      )}

      <select
        {...props}
        className={`${fieldClass} ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  error,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">
          {label}
        </span>
      )}

      <textarea
        {...props}
        className={`min-h-24 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? 'border-danger' : ''
        } ${className}`}
      />

      {error && (
        <span className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
