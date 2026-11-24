import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepItem {
  id: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0" />

        {/* Progress highlight line */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-brand-blue -translate-y-1/2 transition-all duration-300 z-0"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center group"
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2',
                  isCompleted &&
                    'bg-emerald-500 border-emerald-500 text-white shadow-sm',
                  isCurrent &&
                    'bg-brand-blue border-brand-blue text-white ring-4 ring-brand-blue/20 shadow-md',
                  !isCompleted &&
                    !isCurrent &&
                    'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  step.id
                )}
              </div>

              <span
                className={cn(
                  'absolute -bottom-6 text-xs font-medium whitespace-nowrap transition-colors',
                  isCurrent
                    ? 'text-brand-blue dark:text-blue-400 font-semibold'
                    : isCompleted
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
