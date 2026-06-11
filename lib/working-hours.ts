import { parseDateKey, zonedDateTimeToUtc } from "@/lib/dates";
import type { WorkingHours, WorkingHoursDay } from "@/types";

export const WEEKDAYS: {
  key: keyof WorkingHours;
  label: string;
}[] = [
  { key: "monday", label: "Понеділок" },
  { key: "tuesday", label: "Вівторок" },
  { key: "wednesday", label: "Середа" },
  { key: "thursday", label: "Четвер" },
  { key: "friday", label: "П'ятниця" },
  { key: "saturday", label: "Субота" },
  { key: "sunday", label: "Неділя" },
];

const defaultDay = (): WorkingHoursDay => ({
  enabled: false,
  start: "09:00",
  end: "18:00",
});

export function defaultWorkingHours(): WorkingHours {
  return {
    monday: { enabled: true, start: "09:00", end: "18:00" },
    tuesday: { enabled: true, start: "09:00", end: "18:00" },
    wednesday: { enabled: true, start: "09:00", end: "18:00" },
    thursday: { enabled: true, start: "09:00", end: "18:00" },
    friday: { enabled: true, start: "09:00", end: "18:00" },
    saturday: defaultDay(),
    sunday: defaultDay(),
  };
}

export function parseWorkingHours(
  raw: Record<string, unknown> | null | undefined,
): WorkingHours {
  const base = defaultWorkingHours();
  if (!raw || typeof raw !== "object") return base;

  for (const { key } of WEEKDAYS) {
    const day = raw[key];
    if (day && typeof day === "object" && day !== null) {
      const d = day as Record<string, unknown>;
      base[key] = {
        enabled: Boolean(d.enabled ?? d.start),
        start: String(d.start ?? "09:00"),
        end: String(d.end ?? "18:00"),
      };
    }
  }

  return base;
}

export function hasWorkingHoursConfigured(hours: WorkingHours): boolean {
  return WEEKDAYS.some(({ key }) => hours[key].enabled);
}

const WEEKDAY_KEY_BY_JS_DAY: (keyof WorkingHours)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getWeekdayKeyFromDate(date: Date): keyof WorkingHours {
  return WEEKDAY_KEY_BY_JS_DAY[date.getDay()];
}

export function getWeekdayKeyInTimezone(
  date: Date,
  timeZone: string,
): keyof WorkingHours {
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  })
    .format(date)
    .toLowerCase();
  return dayName as keyof WorkingHours;
}

export function isWorkingDay(
  dateKey: string,
  workingHours: WorkingHours,
  timeZone?: string,
): boolean {
  const weekday = timeZone
    ? getWeekdayKeyInTimezone(
        zonedDateTimeToUtc(dateKey, "12:00", timeZone),
        timeZone,
      )
    : getWeekdayKeyFromDate(parseDateKey(dateKey));
  return workingHours[weekday].enabled;
}

export function formatWorkingDaysList(workingHours: WorkingHours): string {
  const enabled = WEEKDAYS.filter(({ key }) => workingHours[key].enabled);
  if (enabled.length === 0) {
    return "графік не налаштовано";
  }
  return enabled
    .map(({ key, label }) => {
      const day = workingHours[key];
      return `${label} ${day.start}–${day.end}`;
    })
    .join(", ");
}
