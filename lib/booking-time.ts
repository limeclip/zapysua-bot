import {
  formatTime,
  minutesToTime,
  parseTimeToMinutes,
  zonedDateTimeToUtc,
} from "@/lib/dates";

export type AvailableSlot = {
  time: string;
  startTime: string;
};

export const TIME_RESOLUTION_ERROR =
  "Помилка визначення часу запису. Спробуйте ще раз.";

export function extractRequestedLocalTime(raw: string): string | null {
  if (!raw) return null;

  const timeMatch = raw.match(/(?:T|\s|^)(\d{1,2}:\d{2})/);
  if (timeMatch) {
    return minutesToTime(parseTimeToMinutes(timeMatch[1]));
  }

  return null;
}

export function isStartTimeInAvailableSlots(
  slots: AvailableSlot[],
  startTime: string,
): boolean {
  const target = new Date(startTime).getTime();
  if (Number.isNaN(target)) return false;
  return slots.some((slot) => new Date(slot.startTime).getTime() === target);
}

export function resolvedTimeMatchesRequest(
  requestedLocalTime: string,
  resolvedStartTime: string,
  timeZone: string,
): boolean {
  return formatTime(resolvedStartTime, timeZone) === requestedLocalTime;
}

export function resolveBookingStartTime(
  dateKey: string,
  timeZone: string,
  slots: AvailableSlot[],
  requestedLocalTime: string,
  rawStartTime?: string,
): string | null {
  const normalizedTime = minutesToTime(parseTimeToMinutes(requestedLocalTime));

  const slotByTime = slots.find((slot) => slot.time === normalizedTime);
  if (slotByTime) {
    return slotByTime.startTime;
  }

  const constructed = zonedDateTimeToUtc(dateKey, normalizedTime, timeZone);
  const slotByIso = slots.find(
    (slot) => new Date(slot.startTime).getTime() === constructed.getTime(),
  );
  if (slotByIso) {
    return slotByIso.startTime;
  }

  if (rawStartTime && isStartTimeInAvailableSlots(slots, rawStartTime)) {
    const slotByRaw = slots.find(
      (slot) => new Date(slot.startTime).getTime() === new Date(rawStartTime).getTime(),
    );
    if (
      slotByRaw &&
      resolvedTimeMatchesRequest(normalizedTime, slotByRaw.startTime, timeZone)
    ) {
      return slotByRaw.startTime;
    }
  }

  return null;
}

export function resolveBookingStartTimeLegacy(
  dateKey: string,
  timeZone: string,
  rawStartTime: string,
  slots: AvailableSlot[],
): string | null {
  const requestedLocalTime = extractRequestedLocalTime(rawStartTime);
  if (!requestedLocalTime) return null;
  return resolveBookingStartTime(
    dateKey,
    timeZone,
    slots,
    requestedLocalTime,
    rawStartTime,
  );
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
