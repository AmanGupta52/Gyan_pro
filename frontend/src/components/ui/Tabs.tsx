import { type ReactNode } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
 * Tabs
 *
 * Built on Radix Tabs. Styled triggers with an
 * animated underline indicator.
 * ───────────────────────────────────────────── */

// ── Root ──────────────────────────────────────

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ className, children, ...props }: TabsProps) {
  return (
    <RadixTabs.Root className={cn('w-full', className)} {...props}>
      {children}
    </RadixTabs.Root>
  );
}

// ── TabsList ──────────────────────────────────

export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ className, children }: TabsListProps) {
  return (
    <RadixTabs.List
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-2xl p-1 bg-slate-900/5 dark:bg-white/10',
        className,
      )}
    >
      {children}
    </RadixTabs.List>
  );
}

// ── TabsTrigger ───────────────────────────────

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, className, children }: TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        'relative flex-1 min-h-[44px] px-4 py-2 text-sm font-semibold text-center rounded-xl',
        'text-slate-600 dark:text-slate-300',
        'transition-all duration-200',
        'hover:text-slate-900 dark:hover:text-white',
        'outline-none focus-visible:ring-2 focus-visible:ring-electric-500/50',
        // Active tab: raised white/glass pill
        'data-[state=active]:bg-white data-[state=active]:text-electric-600 data-[state=active]:shadow-soft',
        'dark:data-[state=active]:bg-white/15 dark:data-[state=active]:text-white',
        className,
      )}
    >
      {children}
    </RadixTabs.Trigger>
  );
}

// ── TabsContent ───────────────────────────────

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  return (
    <RadixTabs.Content
      value={value}
      className={cn('mt-4 outline-none animate-fade-in', className)}
    >
      {children}
    </RadixTabs.Content>
  );
}
