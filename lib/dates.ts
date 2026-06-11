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

/** Понеділок — перший день тижня (uk-UA). */
const UK_WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"] as const;

const UK_WEEKDAYS_LONG = [
  "неділя",
  "понеділок",
  "вівторок",
  "середа",
  "четвер",
  "п'ятниця",
  "субота",
] as const;

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

/** Назва дня тижня українською (понеділок = 1-й день тижня в календарі). */
export function getWeekdayNameUA(
  dateKey: string,
  timeZone = "Europe/Kyiv",
): string {
  const date = zonedDateTimeToUtc(dateKey, "12:00", timeZone);
  const formatted = new Intl.DateTimeFormat("uk-UA", {
    timeZone,
    weekday: "long",
  }).format(date);
  return formatted.charAt(0).toLowerCase() + formatted.slice(1);
}

/** ISO-номер дня тижня: понеділок = 1, …, неділя = 7. */
export function getIsoWeekday(dateKey: string, timeZone = "Europe/Kyiv"): number {
  const date = zonedDateTimeToUtc(dateKey, "12:00", timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday] ?? 1;
}

/** Формат: «15 червня 2026 (понеділок)». */
export function formatDateLongWithWeekday(
  dateKey: string,
  timeZone = "Europe/Kyiv",
): string {
  const date = zonedDateTimeToUtc(dateKey, "12:00", timeZone);
  const datePart = new Intl.DateTimeFormat("uk-UA", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const weekday = getWeekdayNameUA(dateKey, timeZone);
  return `${datePart} (${weekday})`;
}

/** Локальний номер дня тижня з parseDateKey (0 = неділя … 6 = субота). */
export function getLocalWeekdayIndex(dateKey: string): number {
  return parseDateKey(dateKey).getDay();
}

export function getLocalWeekdayNameUA(dateKey: string): string {
  return UK_WEEKDAYS_LONG[getLocalWeekdayIndex(dateKey)];
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

export function formatBookingDateTime(
  iso: string,
  timeZone: string,
  options?: { contextDay?: string },
): string {
  const date = new Date(iso);
  const time = formatTime(iso, timeZone);
  const bookingDayKey = formatDateKey(date, timeZone);

  if (options?.contextDay && bookingDayKey === options.contextDay) {
    return time;
  }

  const todayKey = formatDateKey(new Date(), timeZone);
  const tomorrowKey = formatDateKey(
    addDays(startOfDayInTimezone(new Date(), timeZone), 1),
    timeZone,
  );

  if (bookingDayKey === todayKey) {
    return `${time} (сьогодні)`;
  }
  if (bookingDayKey === tomorrowKey) {
    return `${time} (завтра)`;
  }

  const [, month, day] = bookingDayKey.split("-");
  return `${time} – ${day}.${month}.${bookingDayKey.slice(0, 4)}`;
}

export function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone }));
  return local.getTime() - utc.getTime();
}

export function zonedDateTimeToUtc(
  dateKey: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const localAsUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimezoneOffsetMs(localAsUtc, timeZone);
  return new Date(localAsUtc.getTime() - offset);
}

export function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatBookingCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} записів`;
  if (mod10 === 1) return `${count} запис`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} записи`;
  return `${count} записів`;
}
