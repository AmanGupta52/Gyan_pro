import type { ShowAnswersMode } from '@/types';

export const EDUCATION_LEVELS = [
  'Junior KG',
  'Senior KG',
  ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`),
  'Undergraduate',
  'Postgraduate',
  'PhD',
];

/** Pulls the human-readable message out of our API error shape. */
export function apiError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return (
    (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
      ?.message || fallback
  );
}

export const percent = (ratio: number | null | undefined) =>
  ratio == null ? '—' : `${Math.round(ratio * 100)}%`;

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r.toString().padStart(2, '0')}s` : `${r}s`;
}

export const SHOW_ANSWERS_LABEL: Record<ShowAnswersMode, string> = {
  after_each: 'Shown after every question',
  after_finish: 'Shown when the quiz ends',
  never: 'Exam mode — answers hidden',
};

/** <input type="datetime-local"> wants local time without a zone; the API wants ISO. */
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** "Due in 2 days", "Due in 3 h", "Overdue by 1 day"… for deadlines. */
export function dueLabel(iso: string, now = Date.now()): { text: string; overdue: boolean; soon: boolean } {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const span = mins < 60 ? `${Math.max(1, mins)} min` : hours < 48 ? `${hours} h` : `${days} days`;
  return diff >= 0
    ? { text: `Due in ${span}`, overdue: false, soon: diff < 24 * 3600000 }
    : { text: `Overdue by ${span}`, overdue: true, soon: false };
}

export const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  upcoming: 'Opens soon',
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  submitted_late: 'Submitted late',
  overdue: 'Overdue',
};

/** Wrap a CSV cell so commas, quotes and spreadsheet formulas can't break or hijack the file. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]): void {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^\w.-]+/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}
