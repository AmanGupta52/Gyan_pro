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
    'btn-3d bg-gradient-to-b from-electric-400 to-electric-600 text-white focus-visible:ring-electric-500/50',
  secondary:
    'border-2 border-electric-500/70 text-electric-600 dark:text-sky-200 bg-white/40 dark:bg-white/5 backdrop-blur hover:bg-electric-500/10 active:scale-[0.97] focus-visible:ring-electric-500/40',
  ghost:
    'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10 active:scale-[0.97]',
  danger:
    'bg-rose-500 text-white hover:bg-rose-600 active:scale-[0.97] focus-visible:ring-rose-500/40',
} as const;

const sizeStyles = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-2xl',
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
