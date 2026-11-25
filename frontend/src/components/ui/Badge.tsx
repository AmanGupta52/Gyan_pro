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
    'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  warning:
    'bg-amber-400/20 text-amber-900 dark:bg-amber-400/20 dark:text-amber-300',
  error:
    'bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  info:
    'bg-brand-blue/15 text-blue-800 dark:bg-brand-blue/25 dark:text-sky-200',
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
