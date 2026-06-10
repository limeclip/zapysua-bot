import {
  sendBookingReminder,
  sendReturnClientMessage,
  sendThankYouMessage,
  type NotificationType,
} from "@/lib/notifications";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { BookingWithService } from "@/types";

const BOOKING_SELECT = "*, services(id, name, price)";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_2H = 2 * 60 * 60 * 1000;
const MS_2DAYS = 2 * MS_24H;
const MS_HOUR = 60 * 60 * 1000;

function envFlag(name: string, defaultValue = true): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return value === "true" || value === "1";
}

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

async function hasNotification(
  bookingId: string,
  type: NotificationType,
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
  sent_thank_you: number;
  sent_return_client: number;
  schedule: string;
}> {
  const reminder24hEnabled = envFlag("REMINDER_24H_ENABLED", true);
  const reminder2hEnabled = envFlag("REMINDER_2H_ENABLED", true);
  const schedule = process.env.REMINDER_CRON_SCHEDULE ?? "0 * * * *";

  let processed = 0;
  let sent24h = 0;
  let sent2h = 0;

  if (reminder24hEnabled || reminder2hEnabled) {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + MS_2DAYS);

    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("status", "confirmed")
      .gte("booking_start", now.toISOString())
      .lte("booking_start", windowEnd.toISOString());

    if (error) throw error;

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

      if (
        reminder24hEnabled &&
        diffMs <= MS_24H &&
        diffMs > MS_2H
      ) {
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

      if (reminder2hEnabled && diffMs <= MS_2H && diffMs > 0) {
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
  }

  const thankYouResult = await sendThankYouReminder();
  const returnResult = await processReturningCustomersReminder();

  return {
    processed,
    sent_24h: sent24h,
    sent_2h: sent2h,
    sent_thank_you: thankYouResult.sent,
    sent_return_client: returnResult.sent,
    schedule,
  };
}

export async function sendThankYouReminder(): Promise<{ sent: number }> {
  if (!envFlag("THANK_YOU_ENABLED", true)) {
    return { sent: 0 };
  }

  const hoursAfter = envInt("THANK_YOU_HOURS_AFTER", 3);
  const now = new Date();
  const cutoff = new Date(now.getTime() - hoursAfter * MS_HOUR);

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("status", "completed")
    .lte("booking_start", cutoff.toISOString())
    .gte(
      "booking_start",
      new Date(now.getTime() - 7 * MS_24H).toISOString(),
    );

  if (error) throw error;

  let sent = 0;

  for (const booking of (bookings ?? []) as BookingWithService[]) {
    const telegramId = booking.client_telegram_id;
    if (!telegramId) continue;

    const alreadySent = await hasNotification(booking.id, "thank_you");
    if (alreadySent) continue;

    const success = await sendThankYouMessage(booking, telegramId);
    if (success) sent++;
  }

  return { sent };
}

export async function processReturningCustomersReminder(): Promise<{
  sent: number;
}> {
  if (!envFlag("RETURN_CLIENTS_ENABLED", true)) {
    return { sent: 0 };
  }

  const returnDays = envInt("RETURN_DAYS", 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - returnDays);

  const { data: completedBookings, error } = await supabaseAdmin
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("status", "completed")
    .not("client_telegram_id", "is", null)
    .lte("booking_start", cutoff.toISOString())
    .order("booking_start", { ascending: false });

  if (error) throw error;

  const seenCustomers = new Set<string>();
  let sent = 0;

  for (const booking of (completedBookings ?? []) as BookingWithService[]) {
    const customerKey = `${booking.master_id}:${booking.client_telegram_id}`;
    if (seenCustomers.has(customerKey)) continue;
    seenCustomers.add(customerKey);

    const telegramId = booking.client_telegram_id;
    if (!telegramId) continue;

    const alreadySent = await hasNotification(booking.id, "return_client");
    if (alreadySent) continue;

    const { data: master } = await supabaseAdmin
      .from("masters")
      .select("business_name")
      .eq("id", booking.master_id)
      .maybeSingle();

    const success = await sendReturnClientMessage(
      booking,
      telegramId,
      master?.business_name ?? "майстра",
    );
    if (success) sent++;
  }

  return { sent };
}
