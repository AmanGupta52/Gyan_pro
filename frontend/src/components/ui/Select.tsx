import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
 * Select
 *
 * Native <select> styled consistently with <Input>.
 * ───────────────────────────────────────────── */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, leftIcon, placeholder, className, id, children, ...props }, ref) => {
    const selectId = id ?? (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-700/50 dark:text-slate-200/50">
              {leftIcon}
            </span>
          )}

          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
            className={cn(
              'flex h-11 w-full appearance-none rounded-input border bg-white px-4 pr-10 text-sm',
              'text-slate-700 dark:bg-navy-900/50 dark:text-slate-200',
              'transition-colors duration-150',
              'outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue',
              error
                ? 'border-rose-500 focus:ring-rose-500/40 focus:border-rose-500'
                : 'border-slate-200 dark:border-slate-200/20',
              leftIcon && 'pl-10',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>

          {/* Chevron indicator */}
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-700/50 dark:text-slate-200/50">
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-rose-500">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-700/60 dark:text-slate-200/60">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
