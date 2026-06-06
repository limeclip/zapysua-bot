import { sendBookingReminder } from "@/lib/notifications";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { BookingWithService } from "@/types";

const BOOKING_SELECT = "*, services(id, name, price)";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_2H = 2 * 60 * 60 * 1000;
const MS_2DAYS = 2 * MS_24H;

async function hasNotification(
  bookingId: string,
  type: "reminder_24h" | "reminder_2h",
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("type", type)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function processReminders(): Promise<{
  processed: number;
  sent_24h: number;
  sent_2h: number;
}> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + MS_2DAYS);

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("status", "confirmed")
    .gte("booking_start", now.toISOString())
    .lte("booking_start", windowEnd.toISOString());

  if (error) throw error;

  let processed = 0;
  let sent24h = 0;
  let sent2h = 0;

  for (const booking of (bookings ?? []) as BookingWithService[]) {
    const telegramId = booking.client_telegram_id;
    if (!telegramId) continue;

    const bookingStart = new Date(booking.booking_start);
    const diffMs = bookingStart.getTime() - now.getTime();
    processed++;

    const { data: master } = await supabaseAdmin
      .from("masters")
      .select("timezone")
      .eq("id", booking.master_id)
      .maybeSingle();

    const timeZone = master?.timezone ?? "Europe/Kyiv";

    if (diffMs <= MS_24H && diffMs > MS_2H) {
      const alreadySent = await hasNotification(booking.id, "reminder_24h");
      if (!alreadySent) {
        const sent = await sendBookingReminder(
          booking,
          telegramId,
          "reminder_24h",
          { timeZone },
        );
        if (sent) sent24h++;
      }
    }

    if (diffMs <= MS_2H && diffMs > 0) {
      const alreadySent = await hasNotification(booking.id, "reminder_2h");
      if (!alreadySent) {
        const sent = await sendBookingReminder(
          booking,
          telegramId,
          "reminder_2h",
          { timeZone },
        );
        if (sent) sent2h++;
      }
    }
  }

  return { processed, sent_24h: sent24h, sent_2h: sent2h };
}
