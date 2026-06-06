import { supabaseAdmin } from "@/lib/supabase/server";
import type { BookingWithService, Customer } from "@/types";

export type CustomerWithStats = Customer & {
  bookings_count: number;
  last_visit: string | null;
};

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/\s+/g, "");
}

function matchBookingToCustomer(
  booking: {
    client_telegram_id: number | null;
    client_phone: string | null;
    booking_start: string;
    status: string;
  },
  customer: Customer,
): boolean {
  if (
    customer.telegram_id &&
    booking.client_telegram_id === customer.telegram_id
  ) {
    return true;
  }

  const customerPhone = normalizePhone(customer.phone);
  const bookingPhone = normalizePhone(booking.client_phone);
  if (customerPhone && bookingPhone && customerPhone === bookingPhone) {
    return true;
  }

  return false;
}

export function attachBookingStats(
  customers: Customer[],
  bookings: {
    client_telegram_id: number | null;
    client_phone: string | null;
    booking_start: string;
    status: string;
  }[],
): CustomerWithStats[] {
  return customers.map((customer) => {
    const matched = bookings.filter((b) => matchBookingToCustomer(b, customer));
    const visitBookings = matched.filter((b) =>
      ["confirmed", "completed"].includes(b.status),
    );

    const lastVisit =
      visitBookings.length > 0
        ? visitBookings.reduce((latest, b) =>
            new Date(b.booking_start) > new Date(latest.booking_start)
              ? b
              : latest,
          ).booking_start
        : null;

    return {
      ...customer,
      bookings_count: matched.length,
      last_visit: lastVisit,
    };
  });
}

export async function getCustomerBookings(
  masterId: string,
  customer: Customer,
): Promise<BookingWithService[]> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*, services(id, name, price)")
    .eq("master_id", masterId)
    .order("booking_start", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as BookingWithService[]).filter((booking) =>
    matchBookingToCustomer(booking, customer),
  );
}
