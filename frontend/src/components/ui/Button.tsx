import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
 * Button
 *
 * Variants : primary | secondary | ghost | danger
 * Sizes    : sm | md | lg
 * Extras   : loading spinner, icons, full-width
 * ───────────────────────────────────────────── */

const variantStyles = {
  primary:
    'bg-brand-blue text-white hover:bg-blue-500 active:scale-[0.97] focus-visible:ring-brand-blue/40',
  secondary:
    'border-2 border-brand-blue text-brand-blue bg-transparent hover:bg-brand-blue/10 active:scale-[0.97] focus-visible:ring-brand-blue/40',
  ghost:
    'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-navy-700/60 active:scale-[0.97]',
  danger:
    'bg-rose-500 text-white hover:bg-rose-500/90 active:scale-[0.97] focus-visible:ring-rose-500/40',
} as const;

const sizeStyles = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-5 text-sm gap-2 rounded-input',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-input',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // base
          'inline-flex items-center justify-center font-semibold',
          'transition-all duration-150 ease-out',
          'outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-navy-900',
          'disabled:pointer-events-none disabled:opacity-50',
          'select-none whitespace-nowrap',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon && (
            <span className="shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )
        )}

        {children}

        {!loading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
