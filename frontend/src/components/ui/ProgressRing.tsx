import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  className?: string;
  circleColorClass?: string;
  trackColorClass?: string;
  showText?: boolean;
  textClassName?: string;
}

export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 6,
  className,
  circleColorClass = 'text-brand-blue',
  trackColorClass = 'text-slate-200 dark:text-slate-700',
  showText = true,
  textClassName,
}: ProgressRingProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (normalizedProgress / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={cn('fill-transparent transition-colors', trackColorClass)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            'fill-transparent transition-all duration-500 ease-out',
            circleColorClass
          )}
        />
      </svg>
      {showText && (
        <span
          className={cn(
            'absolute text-xs font-semibold text-slate-800 dark:text-slate-100',
            textClassName
          )}
        >
          {Math.round(normalizedProgress)}%
        </span>
      )}
    </div>
  );
}
