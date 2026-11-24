import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, label, colorClass } = useMemo(() => {
    if (!password) {
      return { score: 0, label: '', colorClass: 'bg-slate-200 dark:bg-slate-700' };
    }

    let points = 0;
    if (password.length >= 8) points++;
    if (password.length >= 12) points++;
    if (/[A-Z]/.test(password)) points++;
    if (/[a-z]/.test(password)) points++;
    if (/[0-9]/.test(password)) points++;
    if (/[^A-Za-z0-9]/.test(password)) points++;

    if (points <= 2) {
      return {
        score: 1,
        label: 'Weak',
        colorClass: 'bg-rose-500',
      };
    }
    if (points <= 4) {
      return {
        score: 2,
        label: 'Fair',
        colorClass: 'bg-amber-400',
      };
    }
    if (points <= 5) {
      return {
        score: 3,
        label: 'Good',
        colorClass: 'bg-blue-500',
      };
    }
    return {
      score: 4,
      label: 'Strong',
      colorClass: 'bg-emerald-500',
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className={cn('space-y-1.5 mt-1.5', className)}>
      <div className="flex gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              'h-full flex-1 rounded-full transition-all duration-300',
              step <= score
                ? colorClass
                : 'bg-slate-200 dark:bg-slate-700'
            )}
          />
        ))}
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500 dark:text-slate-400">Password strength</span>
        <span
          className={cn(
            'font-medium',
            score === 1 && 'text-rose-500',
            score === 2 && 'text-amber-500',
            score === 3 && 'text-blue-500',
            score === 4 && 'text-emerald-500'
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
