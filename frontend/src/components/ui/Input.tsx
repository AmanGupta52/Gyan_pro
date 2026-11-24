import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
 * Input
 *
 * Form input with label, error, helper text,
 * left/right icons, and password toggle.
 * Compatible with React Hook Form via forwardRef.
 * ───────────────────────────────────────────── */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Render as a password field with show/hide toggle */
  isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      isPassword = false,
      className,
      id,
      type,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id ?? (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-700/50 dark:text-slate-200/50">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-invalid={!!error}
            aria-describedby={
              [errorId, helperId].filter(Boolean).join(' ') || undefined
            }
            className={cn(
              'flex h-11 w-full rounded-input border bg-white px-4 text-sm',
              'text-slate-700 placeholder:text-slate-700/40',
              'dark:bg-navy-900/50 dark:text-slate-200 dark:placeholder:text-slate-200/40',
              'transition-colors duration-150',
              'outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue',
              error
                ? 'border-rose-500 focus:ring-rose-500/40 focus:border-rose-500'
                : 'border-slate-200 dark:border-slate-200/20',
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            {...props}
          />

          {/* Right icon OR password toggle */}
          {isPassword ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-700/50 hover:text-slate-700 dark:text-slate-200/50 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          ) : (
            rightIcon && (
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-700/50 dark:text-slate-200/50">
                {rightIcon}
              </span>
            )
          )}
        </div>

        {/* Error message */}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-rose-500">
            {error}
          </p>
        )}

        {/* Helper text */}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-700/60 dark:text-slate-200/60">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
