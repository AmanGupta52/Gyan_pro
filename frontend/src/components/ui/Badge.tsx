import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
 * Badge
 *
 * Variants : default | success | warning | error | info
 * Sizes    : sm | md
 * ───────────────────────────────────────────── */

const variantStyles = {
  default:
    'bg-slate-200/60 text-slate-700 dark:bg-slate-200/10 dark:text-slate-200',
  success:
    'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/20',
  warning:
    'bg-amber-400/15 text-amber-400 dark:bg-amber-400/20',
  error:
    'bg-rose-500/15 text-rose-500 dark:bg-rose-500/20',
  info:
    'bg-brand-blue/15 text-brand-blue dark:bg-brand-blue/20',
} as const;

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
}

export function Badge({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold leading-none whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
