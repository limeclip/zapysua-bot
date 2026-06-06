import { bot } from "@/lib/bot";
import { formatDateKey, formatDateLong, formatTime } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { BookingWithService, Customer } from "@/types";

type NotificationType = "confirmation" | "reminder_24h" | "reminder_2h" | "return_client";

async function logNotification(
  bookingId: string,
  type: NotificationType,
  status: "sent" | "failed",
): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").insert({
    booking_id: bookingId,
    type,
    status,
  });

  if (error) {
    console.error("[notifications] logNotification:", error);
  }
}

function formatBookingDetails(
  booking: BookingWithService,
  timeZone: string,
): { serviceName: string; dateTime: string } {
  const dateKey = formatDateKey(new Date(booking.booking_start), timeZone);
  const serviceName = booking.services?.name ?? "Послуга";
  const dateTime = `${formatDateLong(dateKey)}, ${formatTime(booking.booking_start, timeZone)}`;

  return { serviceName, dateTime };
}

export async function sendTelegramMessage(
  telegramId: number,
  text: string,
): Promise<boolean> {
  try {
    await bot.api.sendMessage(telegramId, text);
    return true;
  } catch (error) {
    console.error("[notifications] sendTelegramMessage:", error);
    return false;
  }
}

export async function sendBookingConfirmation(
  booking: BookingWithService,
  customer: Pick<Customer, "telegram_id" | "name"> | { telegram_id?: number | null },
  options?: { timeZone?: string },
): Promise<void> {
  const telegramId =
    customer.telegram_id ?? booking.client_telegram_id ?? null;

  if (!telegramId) {
    return;
  }

  const timeZone = options?.timeZone ?? "Europe/Kyiv";
  const { serviceName, dateTime } = formatBookingDetails(booking, timeZone);

  const text =
    `✅ Ваш запис підтверджено!\n\n` +
    `Деталі: ${serviceName}, ${dateTime}.\n` +
    `Очікуйте нагадування.`;

  const sent = await sendTelegramMessage(telegramId, text);
  await logNotification(booking.id, "confirmation", sent ? "sent" : "failed");
}

export async function sendBookingReminder(
  booking: BookingWithService,
  telegramId: number,
  type: "reminder_24h" | "reminder_2h",
  options?: { timeZone?: string },
): Promise<boolean> {
  const timeZone = options?.timeZone ?? "Europe/Kyiv";
  const { serviceName, dateTime } = formatBookingDetails(booking, timeZone);

  const text =
    type === "reminder_24h"
      ? `🔔 Нагадування!\n\nЗавтра у вас запис: ${serviceName}, ${dateTime}.`
      : `⏰ Нагадування!\n\nЧерез 2 години у вас запис: ${serviceName}, ${dateTime}.`;

  const sent = await sendTelegramMessage(telegramId, text);
  await logNotification(booking.id, type, sent ? "sent" : "failed");
  return sent;
}
