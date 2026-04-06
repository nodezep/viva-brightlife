export type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

export function parseDateOnly(value: string): DateOnlyParts | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return {year, month, day};
}

export function formatDateOnly(parts: DateOnlyParts): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function toUtcDate(value: string): Date | null {
  const parts = parseDateOnly(value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function formatDateOnlyFromUtc(date: Date): string {
  return formatDateOnly({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  });
}

export function addDaysToDateOnly(value: string, days: number): string | null {
  if (!Number.isFinite(days)) return null;
  const base = toUtcDate(value);
  if (!base) return null;
  base.setUTCDate(base.getUTCDate() + days);
  return formatDateOnlyFromUtc(base);
}

export function addMonthsToDateOnly(value: string, months: number): string | null {
  if (!Number.isFinite(months)) return null;
  const base = toUtcDate(value);
  if (!base) return null;
  const day = base.getUTCDate();
  base.setUTCMonth(base.getUTCMonth() + months);
  if (base.getUTCDate() < day) {
    base.setUTCDate(0);
  }
  return formatDateOnlyFromUtc(base);
}
