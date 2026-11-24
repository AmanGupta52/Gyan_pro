import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
 * Card
 *
 * Variants: default | outlined | elevated
 * ───────────────────────────────────────────── */

const variantStyles = {
  default: 'bg-white dark:bg-navy-900/60 shadow-soft',
  outlined: 'bg-white dark:bg-navy-900/60 border border-slate-200 dark:border-slate-200/10',
  elevated:
    'bg-white dark:bg-navy-900/60 shadow-soft hover:shadow-lifted transition-shadow duration-200',
} as const;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantStyles;
  /** Whether the card elevates on hover */
  hoverElevation?: boolean;
  children: ReactNode;
}

export function Card({
  variant = 'default',
  hoverElevation = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card p-6',
        variantStyles[variant],
        hoverElevation && 'hover:shadow-lifted transition-shadow duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* Sub-components for semantic structure */

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-slate-700 dark:text-slate-200', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}
