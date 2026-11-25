interface CircularTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularTimer({
  totalSeconds,
  remainingSeconds,
  size = 72,
  strokeWidth = 6,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const validTotal = Math.max(1, totalSeconds);
  const validRemaining = Math.max(0, Math.min(validTotal, remainingSeconds));
  const progressRatio = validRemaining / validTotal;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Color coding
  let colorClass = 'text-brand-blue stroke-brand-blue';
  let pulseClass = '';

  if (validRemaining <= 5) {
    colorClass = 'text-rose-500 stroke-rose-500';
    pulseClass = 'animate-pulse';
  } else if (validRemaining <= 10) {
    colorClass = 'text-amber-500 stroke-amber-500';
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${pulseClass}`}
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-200 dark:stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${colorClass} transition-all duration-300 ease-linear`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`font-mono font-black text-lg ${colorClass}`}>
          {validRemaining}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold -mt-1">
          sec
        </span>
      </div>
    </div>
  );
}
