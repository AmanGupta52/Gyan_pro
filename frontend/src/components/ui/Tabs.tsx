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
        'inline-flex w-full items-center border-b border-slate-200 dark:border-slate-200/10',
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
        'relative flex-1 px-4 py-2.5 text-sm font-medium text-center',
        'text-slate-700/60 dark:text-slate-200/60',
        'transition-colors duration-150',
        'hover:text-slate-700 dark:hover:text-slate-200',
        'outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 focus-visible:ring-inset',
        // Active tab styles
        'data-[state=active]:text-brand-blue',
        // Animated underline via pseudo-element
        'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5',
        'after:scale-x-0 after:bg-brand-blue after:transition-transform after:duration-200',
        'data-[state=active]:after:scale-x-100',
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
