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

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

export function formatDateKey(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function zonedDateTimeToUtc(
  dateKey: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  let utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = getZonedParts(new Date(utcGuess), timeZone);
    const actualUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const wantedUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    utcGuess += wantedUtc - actualUtc;
  }

  return new Date(utcGuess);
}

export function startOfDayInTimezone(date: Date, timeZone: string): Date {
  const key = formatDateKey(date, timeZone);
  return zonedDateTimeToUtc(key, "00:00", timeZone);
}

export function endOfDayInTimezone(date: Date, timeZone: string): Date {
  const key = formatDateKey(date, timeZone);
  const nextKey = addDays(parseDateKey(key), 1);
  const nextKeyStr = `${nextKey.getFullYear()}-${String(nextKey.getMonth() + 1).padStart(2, "0")}-${String(nextKey.getDate()).padStart(2, "0")}`;
  return new Date(zonedDateTimeToUtc(nextKeyStr, "00:00", timeZone).getTime() - 1);
}

export function getDayRangeIso(
  dateKey: string,
  timeZone: string,
): { start: string; end: string } {
  const start = zonedDateTimeToUtc(dateKey, "00:00", timeZone);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date, timeZone: string): Date {
  const key = formatDateKey(date, timeZone);
  const local = parseDateKey(key);
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

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDateLong(key: string): string {
  const date = parseDateKey(key);
  return `${date.getDate()} ${UK_MONTHS[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
}

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
  const key = formatDateKey(date, timeZone);
  return zonedDateTimeToUtc(key, "00:00", timeZone).toISOString();
}

export function toIsoRangeEnd(date: Date, timeZone: string): string {
  const key = formatDateKey(date, timeZone);
  return getDayRangeIso(key, timeZone).end;
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

export function extractLocalTimeFromIso(
  iso: string,
  timeZone: string,
): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatTime(iso, timeZone);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const next = addDays(parseDateKey(dateKey), days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

const UA_MONTHS: Record<string, number> = {
  січня: 1,
  січень: 1,
  лютого: 2,
  лютий: 2,
  березня: 3,
  березень: 3,
  квітня: 4,
  квітень: 4,
  травня: 5,
  травень: 5,
  червня: 6,
  червень: 6,
  липня: 7,
  липень: 7,
  серпня: 8,
  серпень: 8,
  вересня: 9,
  вересень: 9,
  жовтня: 10,
  жовтень: 10,
  листопада: 11,
  листопад: 11,
  грудня: 12,
  грудень: 12,
};

export function parseDateFromUserText(
  text: string,
  timeZone: string,
): string[] {
  const found = new Set<string>();
  const referenceYear = Number(formatDateKey(new Date(), timeZone).slice(0, 4));

  for (const match of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
    found.add(match[1]);
  }

  for (const match of text.matchAll(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\b/g)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = match[3] ? Number(match[3]) : referenceYear;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      found.add(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
    }
  }

  for (const match of text.matchAll(
    /\b(\d{1,2})\s+(січня|січень|лютого|лютий|березня|березень|квітня|квітень|травня|травень|червня|червень|липня|липень|серпня|серпень|вересня|вересень|жовтня|жовтень|листопада|листопад|грудня|грудень)\b/gi,
  )) {
    const day = Number(match[1]);
    const month = UA_MONTHS[match[2].toLowerCase()];
    if (!month || day < 1 || day > 31) continue;
    const year = referenceYear;
    found.add(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }

  return [...found];
}

export function extractRequestedTimeFromText(text: string): string | null {
  const match = text.match(/\b(\d{1,2}:\d{2})\b/);
  if (!match) return null;
  return minutesToTime(parseTimeToMinutes(match[1]));
}
