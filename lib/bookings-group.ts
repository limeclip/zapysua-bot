import { formatDateKey } from "@/lib/dates";
import type { BookingStatus, BookingWithService } from "@/types";

export const COUNTABLE_BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
];

export function groupBookingsByDateKey(
  bookings: BookingWithService[],
  timeZone: string,
): Map<string, BookingWithService[]> {
  const map = new Map<string, BookingWithService[]>();

  for (const booking of bookings) {
    const key = formatDateKey(new Date(booking.booking_start), timeZone);
    const list = map.get(key);
    if (list) {
      list.push(booking);
    } else {
      map.set(key, [booking]);
    }
  }

  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.booking_start).getTime() -
        new Date(b.booking_start).getTime(),
    );
  }

  return map;
}

export function countCountableBookings(bookings: BookingWithService[]): number {
  return bookings.filter((booking) =>
    COUNTABLE_BOOKING_STATUSES.includes(booking.status),
  ).length;
}
