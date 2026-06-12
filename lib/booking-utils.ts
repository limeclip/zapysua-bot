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
  time: string;
  startTime: string;
};

function isSlotStartWithinBooking(
  slotStart: Date,
  bookingStart: Date,
  durationMinutes: number,
): boolean {
  const bookingEnd = new Date(bookingStart.getTime() + durationMinutes * 60 * 1000);
  return slotStart >= bookingStart && slotStart < bookingEnd;
}

export function isStartTimeInAvailableSlots(
  slots: AvailableSlot[],
  startTime: string,
): boolean {
  const target = new Date(startTime).getTime();
  if (isNaN(target)) return false;
  return slots.some((slot) => new Date(slot.startTime).getTime() === target);
}

export async function getAvailableSlots(
  masterId: string,
  date: string,
  serviceId: string,
): Promise<AvailableSlot[]> {
  // Отримуємо тривалість послуги
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

  // Отримуємо робочі години майстра
  const { data: master, error: masterError } = await supabaseAdmin
    .from("masters")
    .select("working_hours, timezone")
    .eq("id", masterId)
    .maybeSingle();
  if (masterError) throw masterError;
  if (!master) return [];

  const workingHours: WorkingHours = parseWorkingHours(master.working_hours as Record<string, unknown> | null);
  const timeZone = master.timezone ?? "Europe/Kyiv";

  // Визначаємо день тижня (без часового поясу, використовуємо dateKey безпосередньо)
  // Оскільки date має формат YYYY-MM-DD, ми парсимо його як локальну дату
  const dateObj = new Date(`${date}T12:00:00`); // умовна дата для визначення дня
  const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekdayKey = weekdayNames[dateObj.getDay()] as keyof WorkingHours;
  const dayConfig = workingHours[weekdayKey];
  if (!dayConfig.enabled) return [];

  const dayStartMinutes = parseTimeToMinutes(dayConfig.start);
  const dayEndMinutes = parseTimeToMinutes(dayConfig.end);
  if (dayEndMinutes - dayStartMinutes < durationMinutes) return [];

  // Генеруємо слоти з кроком = durationMinutes
  const slots: AvailableSlot[] = [];
  for (
    let minutes = dayStartMinutes;
    minutes + durationMinutes <= dayEndMinutes;
    minutes += durationMinutes
  ) {
    const time = minutesToTime(minutes);
    const slotStart = zonedDateTimeToUtc(date, time, timeZone);
    if (slotStart <= new Date()) continue; // пропускаємо минулі слоти
    slots.push({ time, startTime: slotStart.toISOString() });
  }

  // Отримуємо зайняті записи на цю дату
  const rangeStart = toIsoRangeStart(new Date(date), timeZone);
  const rangeEnd = toIsoRangeEnd(new Date(date), timeZone);
  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("booking_start, duration_minutes, service_id")
    .eq("master_id", masterId)
    .in("status", ["pending", "confirmed"])
    .gte("booking_start", rangeStart)
    .lte("booking_start", rangeEnd);
  if (bookingsError) throw bookingsError;

  // Збираємо тривалості для всіх послуг, що зустрічаються
  const serviceIds = [...new Set(bookings?.map(b => b.service_id).filter(Boolean))];
  const durationByServiceId = new Map<string, number>();
  durationByServiceId.set(serviceId, durationMinutes);
  if (serviceIds.length) {
    const { data: services } = await supabaseAdmin
      .from("services")
      .select("id, duration_minutes")
      .in("id", serviceIds);
    for (const svc of services ?? []) {
      durationByServiceId.set(svc.id, svc.duration_minutes);
    }
  }

  // Фільтруємо зайняті слоти
  const availableSlots = slots.filter((slot) => {
    const slotStartDate = new Date(slot.startTime);
    for (const booking of bookings ?? []) {
      const bookingDuration = booking.duration_minutes ?? durationByServiceId.get(booking.service_id) ?? durationMinutes;
      if (isSlotStartWithinBooking(slotStartDate, new Date(booking.booking_start), bookingDuration)) {
        return false;
      }
    }
    return true;
  });

  return availableSlots;
}