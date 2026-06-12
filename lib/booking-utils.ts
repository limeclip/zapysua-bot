import {
  minutesToTime,
  parseTimeToMinutes,
  toIsoRangeEnd,
  toIsoRangeStart,
  zonedDateTimeToUtc,
} from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getWeekdayKeyInTimezone,
  parseWorkingHours,
} from "@/lib/working-hours";
import type { WorkingHours } from "@/types";

export type AvailableSlot = {
  /** Час у форматі HH:MM (часовий пояс майстра). */
  time: string;
  /** ISO UTC для створення запису. */
  startTime: string;
};

function isSlotStartWithinBooking(
  slotStart: Date,
  bookingStart: Date,
  durationMinutes: number,
): boolean {
  const bookingEnd = new Date(
    bookingStart.getTime() + durationMinutes * 60 * 1000,
  );
  return slotStart >= bookingStart && slotStart < bookingEnd;
}

export function isStartTimeInAvailableSlots(
  slots: AvailableSlot[],
  startTime: string,
): boolean {
  const target = new Date(startTime).getTime();
  if (Number.isNaN(target)) return false;
  return slots.some((slot) => new Date(slot.startTime).getTime() === target);
}

export async function getAvailableSlots(
  masterId: string,
  date: string,
  serviceId: string,
): Promise<AvailableSlot[]> {
  const { data: service, error: serviceError } = await supabaseAdmin
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .eq("master_id", masterId)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError) throw serviceError;
  const durationMinutes = service?.duration_minutes;
  if (!durationMinutes || durationMinutes < 1) return [];

  const { data: master, error: masterError } = await supabaseAdmin
    .from("masters")
    .select("working_hours, timezone")
    .eq("id", masterId)
    .maybeSingle();

  if (masterError) throw masterError;
  if (!master) return [];

  const workingHours: WorkingHours = parseWorkingHours(
    master.working_hours as Record<string, unknown> | null,
  );
  const timeZone = master.timezone ?? "Europe/Kyiv";

  const weekday = getWeekdayKeyInTimezone(
    zonedDateTimeToUtc(date, "12:00", timeZone),
    timeZone,
  );
  const dayConfig = workingHours[weekday];
  if (!dayConfig.enabled) return [];

  const dayStartMinutes = parseTimeToMinutes(dayConfig.start);
  const dayEndMinutes = parseTimeToMinutes(dayConfig.end);
  if (dayEndMinutes - dayStartMinutes < durationMinutes) return [];

  const dateObj = zonedDateTimeToUtc(date, "00:00", timeZone);
  const rangeStart = toIsoRangeStart(dateObj, timeZone);
  const rangeEnd = toIsoRangeEnd(dateObj, timeZone);

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("booking_start, duration_minutes, service_id")
    .eq("master_id", masterId)
    .in("status", ["pending", "confirmed"])
    .gte("booking_start", rangeStart)
    .lte("booking_start", rangeEnd);

  if (bookingsError) throw bookingsError;

  const serviceIds = [
    ...new Set(
      (bookings ?? [])
        .map((b) => b.service_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const durationByServiceId = new Map<string, number>();
  durationByServiceId.set(serviceId, durationMinutes);

  if (serviceIds.length > 0) {
    const { data: services, error: servicesError } = await supabaseAdmin
      .from("services")
      .select("id, duration_minutes")
      .in("id", serviceIds);

    if (servicesError) throw servicesError;
    for (const svc of services ?? []) {
      durationByServiceId.set(svc.id, svc.duration_minutes);
    }
  }

  const now = new Date();
  const slots: AvailableSlot[] = [];

  for (
    let minutes = dayStartMinutes;
    minutes + durationMinutes <= dayEndMinutes;
    minutes += durationMinutes
  ) {
    const time = minutesToTime(minutes);
    const slotStart = zonedDateTimeToUtc(date, time, timeZone);

    if (slotStart <= now) continue;

    const blocked = (bookings ?? []).some((booking) => {
      const bookingDuration =
        booking.duration_minutes ??
        durationByServiceId.get(booking.service_id as string) ??
        durationMinutes;
      return isSlotStartWithinBooking(
        slotStart,
        new Date(booking.booking_start),
        bookingDuration,
      );
    });

    if (!blocked) {
      slots.push({
        time,
        startTime: slotStart.toISOString(),
      });
    }
  }

  return slots;
}
