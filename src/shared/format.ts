/**
 * Display formatting. The backend sends `LocalDateTime` strings without a
 * timezone (`2026-11-11T14:20:00`), which `Date` reads as local time.
 */
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const MONEY = new Intl.NumberFormat('en-PE', {
  style: 'currency',
  currency: 'PEN',
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME.format(date);
}

export function formatMoney(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? MONEY.format(value)
    : '—';
}
