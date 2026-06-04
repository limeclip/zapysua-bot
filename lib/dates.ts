const UK_MONTHS = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
] as const;

const UK_WEEKDAYS_SHORT = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

export function formatDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDayInTimezone(date: Date, timeZone: string): Date {
  const key = formatDateKey(date, timeZone);
  return parseDateKey(key);
}

export function endOfDayInTimezone(date: Date, timeZone: string): Date {
  const start = startOfDayInTimezone(date, timeZone);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return end;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date, timeZone: string): Date {
  const local = startOfDayInTimezone(date, timeZone);
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(local, diff);
}

export function endOfWeek(date: Date, timeZone: string): Date {
  const start = startOfWeek(date, timeZone);
  return endOfDayInTimezone(addDays(start, 6), timeZone);
}

export function startOfMonth(date: Date, timeZone: string): Date {
  const key = formatDateKey(date, timeZone);
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export function endOfMonth(date: Date, timeZone: string): Date {
  const start = startOfMonth(date, timeZone);
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  return next;
}

export function formatTime(
  iso: string,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(new Date(iso));
}

export function formatDateLong(key: string): string {
  const date = parseDateKey(key);
  return `${date.getDate()} ${UK_MONTHS[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
}

export function formatMonthYear(date: Date): string {
  return `${UK_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function getCalendarGrid(month: Date): {
  days: (Date | null)[];
  weekdayLabels: readonly string[];
} {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, monthIndex, d));
  }

  return { days, weekdayLabels: UK_WEEKDAYS_SHORT };
}

export function toIsoRangeStart(date: Date, timeZone: string): string {
  return startOfDayInTimezone(date, timeZone).toISOString();
}

export function toIsoRangeEnd(date: Date, timeZone: string): string {
  return endOfDayInTimezone(date, timeZone).toISOString();
}
