import { cn } from '@/lib/utils';

interface MascotProps {
  className?: string;
  /** Accessible description; decorative when omitted */
  title?: string;
}

/**
 * "Gyani" — the friendly GYAN-26 owl mascot (inline SVG, no external assets).
 * Decorative by default (aria-hidden) unless a title is given.
 */
export function Mascot({ className, title }: MascotProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn('drop-shadow-xl', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id="gy-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B9DFF" />
          <stop offset="1" stopColor="#1D5FE8" />
        </linearGradient>
        <linearGradient id="gy-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#E0EDFF" />
        </linearGradient>
      </defs>
      {/* body */}
      <ellipse cx="100" cy="122" rx="62" ry="64" fill="url(#gy-body)" />
      <ellipse cx="100" cy="140" rx="38" ry="40" fill="url(#gy-belly)" />
      {/* wings */}
      <path d="M40 120c-14 10-16 34-6 48 12-4 22-18 22-34z" fill="#1D5FE8" />
      <path d="M160 120c14 10 16 34 6 48-12-4-22-18-22-34z" fill="#1D5FE8" />
      {/* eyes */}
      <circle cx="76" cy="96" r="22" fill="#fff" />
      <circle cx="124" cy="96" r="22" fill="#fff" />
      <circle cx="80" cy="98" r="10" fill="#0B1B3F" />
      <circle cx="120" cy="98" r="10" fill="#0B1B3F" />
      <circle cx="83" cy="94" r="3.5" fill="#fff" />
      <circle cx="123" cy="94" r="3.5" fill="#fff" />
      {/* beak */}
      <path d="M92 108h16l-8 14z" fill="#FBBF24" />
      {/* feet */}
      <ellipse cx="82" cy="184" rx="14" ry="6" fill="#FBBF24" />
      <ellipse cx="118" cy="184" rx="14" ry="6" fill="#FBBF24" />
      {/* graduation cap */}
      <path d="M100 36 44 58l56 22 56-22z" fill="#0B1B3F" />
      <path d="M72 70v16c0 8 56 8 56 0V70l-28 11z" fill="#14306B" />
      <path d="M150 62v26" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
      <circle cx="150" cy="92" r="5" fill="#FBBF24" />
    </svg>
  );
}
