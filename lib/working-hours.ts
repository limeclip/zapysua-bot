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
