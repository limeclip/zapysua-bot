import {
  getDayRangeIso,
  minutesToTime,
  parseTimeToMinutes,
  zonedDateTimeToUtc,
} from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getWeekdayKeyInTimezone,
  parseWorkingHours,
} from "@/lib/working-hours";
import {
  isSlotStartWithinBooking,
  isStartTimeInAvailableSlots,
  resolveBookingStartTime,
  type AvailableSlot,
} from "@/lib/booking-time";
import type { WorkingHours } from "@/types";

export type { AvailableSlot } from "@/lib/booking-time";
export {
  isStartTimeInAvailableSlots,
  resolveBookingStartTime,
} from "@/lib/booking-time";

function logBookingDebug(
  tag: "SHOW_SLOTS" | "BOOK" | "CONFIRM_BOOKING",
  data: Record<string, unknown>,
): void {
  console.log(`[${tag}]`, JSON.stringify(data));
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
  if (!dayConfig?.enabled) {
    logBookingDebug("SHOW_SLOTS", {
      masterId,
      serviceId,
      date,
      timezone: timeZone,
      weekday,
      availableSlots: [],
      reason: "day_off",
    });
    return [];
  }

  const dayStartMinutes = parseTimeToMinutes(dayConfig.start);
  const dayEndMinutes = parseTimeToMinutes(dayConfig.end);
  if (dayEndMinutes - dayStartMinutes < durationMinutes) return [];

  const { start: rangeStart, end: rangeEnd } = getDayRangeIso(date, timeZone);

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

  logBookingDebug("SHOW_SLOTS", {
    masterId,
    serviceId,
    date,
    timezone: timeZone,
    durationMinutes,
    availableSlots: slots,
  });

  return slots;
}
