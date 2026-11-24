import { type HTMLAttributes } from 'react';
import { cn, getInitials } from '@/lib/utils';

/* ─────────────────────────────────────────────
 * Avatar
 *
 * Displays a user image or initials fallback.
 * Sizes: xs (24) | sm (32) | md (40) | lg (48) | xl (56)
 * ───────────────────────────────────────────── */

const sizeStyles = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
} as const;

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name: string;
  size?: keyof typeof sizeStyles;
}

export function Avatar({ src, name, size = 'md', className, ...props }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-brand-blue/10 font-semibold text-brand-blue',
        'select-none overflow-hidden',
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Hide broken images; the initials fallback shows through
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
