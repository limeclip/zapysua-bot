import {
  extractLocalTimeFromIso,
  minutesToTime,
  parseTimeToMinutes,
  zonedDateTimeToUtc,
} from "@/lib/dates";

export type AvailableSlot = {
  time: string;
  startTime: string;
};

export function isStartTimeInAvailableSlots(
  slots: AvailableSlot[],
  startTime: string,
): boolean {
  const target = new Date(startTime).getTime();
  if (Number.isNaN(target)) return false;
  return slots.some((slot) => new Date(slot.startTime).getTime() === target);
}

export function resolveBookingStartTime(
  dateKey: string,
  timeZone: string,
  rawStartTime: string,
  slots: AvailableSlot[],
): string | null {
  if (isStartTimeInAvailableSlots(slots, rawStartTime)) {
    return rawStartTime;
  }

  const exactSlot = slots.find((slot) => slot.startTime === rawStartTime);
  if (exactSlot) return exactSlot.startTime;

  const timeMatch = rawStartTime.match(/(?:T|\s|^)(\d{1,2}:\d{2})/);
  if (timeMatch) {
    const normalized = minutesToTime(parseTimeToMinutes(timeMatch[1]));
    const slotByParsed = slots.find((slot) => slot.time === normalized);
    if (slotByParsed) return slotByParsed.startTime;

    const constructed = zonedDateTimeToUtc(dateKey, normalized, timeZone);
    if (isStartTimeInAvailableSlots(slots, constructed.toISOString())) {
      return constructed.toISOString();
    }
  }

  const localFromRaw = extractLocalTimeFromIso(rawStartTime, timeZone);
  if (localFromRaw) {
    const slotByLocal = slots.find((slot) => slot.time === localFromRaw);
    if (slotByLocal) return slotByLocal.startTime;
  }

  return null;
}

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

export { isSlotStartWithinBooking };
