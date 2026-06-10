import { bot } from "@/lib/bot";
import { formatDateKey, formatDateLong, formatTime } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  BookingStatus,
  BookingWithService,
  Customer,
  Master,
  Service,
} from "@/types";
import { getClientStartAppLink } from "@/lib/referral";

export type NotificationType =
  | "confirmation"
  | "reminder_24h"
  | "reminder_2h"
  | "return_client"
  | "thank_you";

const SIGNATURE = "З повагою, AI-адміністратор ZapysUa";

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

function getWebappBase(): string {
  return (process.env.WEBAPP_URL ?? "https://zapysua-bot.vercel.app").replace(/\/$/, "");
}

export function getClientAccountUrl(): string {
  return `${getWebappBase()}/client/account`;
}

export function getMasterDashboardUrl(): string {
  return getWebappBase();
}

function formatDateTime(bookingStart: string, timeZone: string): string {
  const dateKey = formatDateKey(new Date(bookingStart), timeZone);
  return `${formatDateLong(dateKey)}, ${formatTime(bookingStart, timeZone)}`;
}

function getServiceName(
  booking: BookingWithService,
  service?: Pick<Service, "name"> | null,
): string {
  return service?.name ?? booking.services?.name ?? "Послуга";
}

function resolveClientTelegramId(
  booking: BookingWithService,
  customer?: Pick<Customer, "telegram_id"> | { telegram_id?: number | null },
): number | null {
  return customer?.telegram_id ?? booking.client_telegram_id ?? null;
}

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
  if (error) console.error("[notifications] logNotification:", error);
}

export async function sendTelegramMessage(telegramId: number, text: string): Promise<boolean> {
  try {
    await bot.api.sendMessage(telegramId, text, { parse_mode: "Markdown" });
    return true;
  } catch (error) {
    console.error("[notifications] sendTelegramMessage:", error);
    try {
      await bot.api.sendMessage(telegramId, text);
      return true;
    } catch (fallbackError) {
      console.error("[notifications] sendTelegramMessage fallback:", fallbackError);
      return false;
    }
  }
}

export function dispatchNotification(task: Promise<void>): void {
  task.catch((error) => console.error("[notifications] dispatch:", error));
}

type NotifyContext = {
  booking: BookingWithService;
  master: Pick<Master, "business_name" | "timezone" | "telegram_id">;
  masterSlug?: string; // опционально
  customer: Pick<Customer, "name" | "telegram_id"> | { name: string; telegram_id?: number | null };
  service?: Pick<Service, "name"> | null;
};

function buildContext(params: NotifyContext, timeZone?: string) {
  const tz = timeZone ?? params.master.timezone ?? "Europe/Kyiv";
  const serviceName = getServiceName(params.booking, params.service);
  const dateTime = formatDateTime(params.booking.booking_start, tz);
  return { serviceName, dateTime, timeZone: tz };
}

export async function notifyMasterNewBooking(params: NotifyContext): Promise<void> {
  const { serviceName, dateTime } = buildContext(params);
  const clientName = escapeMarkdown(params.customer.name);
  const safeService = escapeMarkdown(serviceName);
  const text =
    `📝 *Новий запис*\n\n` +
    `Клієнт *${clientName}* записався на *${safeService}*, ${dateTime}.\n\n` +
    `Будь ласка, підтвердіть або скасуйте запис у кабінеті.\n\n` +
    `👉 [Відкрити кабінет](${getMasterDashboardUrl()})\n\n` +
    SIGNATURE;
  await sendTelegramMessage(params.master.telegram_id, text);
}

export async function notifyMasterBookingCreated(params: NotifyContext): Promise<void> {
  const { serviceName, dateTime } = buildContext(params);
  const clientName = escapeMarkdown(params.customer.name);
  const safeService = escapeMarkdown(serviceName);
  const text =
    `✅ *Запис створено*\n\n` +
    `Ви створили запис для *${clientName}* на *${safeService}*, ${dateTime}.\n` +
    `Статус: *підтверджено*.\n\n` +
    `👉 [Відкрити кабінет](${getMasterDashboardUrl()})\n\n` +
    SIGNATURE;
  await sendTelegramMessage(params.master.telegram_id, text);
}

export async function notifyMasterBookingStatusChange(
  params: NotifyContext & { newStatus: BookingStatus },
): Promise<void> {
  const { serviceName, dateTime } = buildContext(params);
  const clientName = escapeMarkdown(params.customer.name);
  const safeService = escapeMarkdown(serviceName);
  let text: string | null = null;
  if (params.newStatus === "cancelled") {
    text =
      `❌ *Запис скасовано*\n\n` +
      `Ви скасували запис для *${clientName}* на *${safeService}*, ${dateTime}.\n\n` +
      SIGNATURE;
  } else if (params.newStatus === "no_show") {
    text =
      `🚫 *Клієнт не з'явився*\n\n` +
      `Клієнт *${clientName}* не з'явився на запис *${safeService}*, ${dateTime}.\n\n` +
      SIGNATURE;
  }
  if (!text) return;
  await sendTelegramMessage(params.master.telegram_id, text);
}

export async function notifyClientBookingStatusChange(
  params: NotifyContext & {
    newStatus: BookingStatus | "created" | "created_confirmed" | "rescheduled";
  },
): Promise<void> {
  const telegramId = resolveClientTelegramId(params.booking, params.customer);
  if (!telegramId) return;

  const { serviceName, dateTime } = buildContext(params);
  const masterName = escapeMarkdown(params.master.business_name);
  const safeService = escapeMarkdown(serviceName);

  // Если есть masterSlug, используем ссылку на страницу мастера, иначе на дашборд (заглушка)
  const myBookingsLink = params.masterSlug
    ? getClientStartAppLink({ slug: params.masterSlug, id: params.booking.master_id })
    : getMasterDashboardUrl();

  let text: string;
  let logType: NotificationType | null = null;

  switch (params.newStatus) {
    case "created":
      text =
        `📝 *Запис створено*\n\n` +
        `Ви записалися на *${safeService}*, ${dateTime}.\n` +
        `Очікуйте підтвердження від майстра.\n\n` +
        `👉 [Мої записи](${myBookingsLink})\n\n` +
        SIGNATURE;
      break;
    case "created_confirmed":
      text =
        `✅ *Запис підтверджено*\n\n` +
        `Ваш запис на *${safeService}*, ${dateTime} підтверджено майстром *${masterName}*!\n\n` +
        `👉 [Мої записи](${myBookingsLink})\n\n` +
        SIGNATURE;
      break;
    case "confirmed":
      text =
        `✅ *Запис підтверджено*\n\n` +
        `Ваш запис на *${safeService}*, ${dateTime} підтверджено!\n` +
        `Ми нагадаємо про візит за 24 години.\n\n` +
        `👉 [Мої записи](${myBookingsLink})\n\n` +
        SIGNATURE;
      logType = "confirmation";
      break;
    case "cancelled":
      text =
        `❌ *Запис скасовано*\n\n` +
        `Ваш запис на *${safeService}*, ${dateTime} скасовано майстром.\n` +
        `Будь ласка, зверніться до майстра для уточнення.\n\n` +
        `👉 [Мої записи](${myBookingsLink})\n\n` +
        SIGNATURE;
      break;
    case "no_show":
      text =
        `⚠️ *Вас не було на записі*\n\n` +
        `На жаль, ви не з'явилися на запис *${safeService}*, ${dateTime}.\n` +
        `Якщо це помилка, зв'яжіться з майстром.\n\n` +
        `👉 [Мої записи](${myBookingsLink})\n\n` +
        SIGNATURE;
      break;
    case "rescheduled":
      text =
        `📅 *Запис перенесено*\n\n` +
        `Новий час: *${safeService}*, ${dateTime}.\n` +
        `Очікуйте підтвердження від майстра.\n\n` +
        `👉 [Мої записи](${myBookingsLink})\n\n` +
        SIGNATURE;
      break;
    default:
      return;
  }

  const sent = await sendTelegramMessage(telegramId, text);
  if (logType) {
    await logNotification(params.booking.id, logType, sent ? "sent" : "failed");
  }
}

export async function sendBookingReminder(
  booking: BookingWithService,
  telegramId: number,
  type: "reminder_24h" | "reminder_2h",
  options?: { timeZone?: string; masterSlug?: string; masterId?: string },
): Promise<boolean> {
  const timeZone = options?.timeZone ?? "Europe/Kyiv";
  const serviceName = getServiceName(booking);
  const dateTime = formatDateTime(booking.booking_start, timeZone);

  const myBookingsLink = options?.masterSlug
    ? getClientStartAppLink({ slug: options.masterSlug, id: options.masterId ?? booking.master_id })
    : getMasterDashboardUrl();

  const text =
    type === "reminder_24h"
      ? `🔔 *Нагадування*\n\n` +
        `Завтра у вас запис: *${serviceName}*, ${dateTime}.\n` +
        `Якщо щось змінилося, ви можете скасувати або перенести запис.\n\n` +
        `👉 [Мої записи](${myBookingsLink})\n\n` +
        SIGNATURE
      : `⏰ *Нагадування*\n\n` +
        `Через 2 години у вас запис: *${serviceName}*, ${dateTime}.\n` +
        `До зустрічі!\n\n` +
        `👉 [Мої записи](${myBookingsLink})\n\n` +
        SIGNATURE;

  const sent = await sendTelegramMessage(telegramId, text);
  await logNotification(booking.id, type, sent ? "sent" : "failed");
  return sent;
}

export async function sendThankYouMessage(
  booking: BookingWithService,
  telegramId: number,
  masterSlug: string,
): Promise<boolean> {
  const bookAgainLink = getClientStartAppLink({ slug: masterSlug, id: booking.master_id });
  const text =
    `❤️ *Дякуємо за візит!*\n\n` +
    `Будемо раді бачити вас знову.\n\n` +
    `👉 [Записатися знову](${bookAgainLink})\n\n` +
    SIGNATURE;
  const sent = await sendTelegramMessage(telegramId, text);
  await logNotification(booking.id, "thank_you", sent ? "sent" : "failed");
  return sent;
}

export async function sendReturnClientMessage(
  booking: BookingWithService,
  telegramId: number,
  masterName: string,
  masterSlug: string,
): Promise<boolean> {
  const bookLink = getClientStartAppLink({ slug: masterSlug, id: booking.master_id });
  const text =
    `🌷 *Давно не бачились!*\n\n` +
    `Скучаємо за вами у *${masterName}*.\n` +
    `Запишіться на нову зустріч — будемо раді вас бачити!\n\n` +
    `👉 [Записатися](${bookLink})\n\n` +
    SIGNATURE;
  const sent = await sendTelegramMessage(telegramId, text);
  await logNotification(booking.id, "return_client", sent ? "sent" : "failed");
  return sent;
}

// Обратная совместимость (с поддержкой опционального slug)
export async function sendBookingCreated(
  booking: BookingWithService,
  customer: Pick<Customer, "telegram_id" | "name"> | { telegram_id?: number | null; name: string },
  master: Pick<Master, "business_name" | "timezone" | "slug">,
  options?: { confirmedByMaster?: boolean },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: { ...master, telegram_id: 0 },
    masterSlug: master.slug ?? undefined,
    customer,
    newStatus: options?.confirmedByMaster ? "created_confirmed" : "created",
  });
}

export async function sendBookingConfirmation(
  booking: BookingWithService,
  customer: Pick<Customer, "telegram_id" | "name"> | { telegram_id?: number | null; name: string },
  options?: { timeZone?: string; master?: Pick<Master, "business_name" | "timezone" | "slug"> },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: {
      business_name: options?.master?.business_name ?? "",
      timezone: options?.timeZone ?? options?.master?.timezone ?? "Europe/Kyiv",
      telegram_id: 0,
    },
    masterSlug: options?.master?.slug ?? undefined,
    customer,
    newStatus: "confirmed",
  });
}

export async function sendBookingCancelled(
  booking: BookingWithService,
  options?: { timeZone?: string; telegramId?: number | null; master?: Pick<Master, "business_name" | "timezone" | "slug"> },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: {
      business_name: options?.master?.business_name ?? "",
      timezone: options?.timeZone ?? "Europe/Kyiv",
      telegram_id: 0,
    },
    masterSlug: options?.master?.slug ?? undefined,
    customer: {
      name: booking.client_name,
      telegram_id: options?.telegramId ?? booking.client_telegram_id,
    },
    newStatus: "cancelled",
  });
}

export async function sendBookingNoShow(
  booking: BookingWithService,
  options?: { timeZone?: string; telegramId?: number | null; master?: Pick<Master, "business_name" | "timezone" | "slug"> },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: {
      business_name: options?.master?.business_name ?? "",
      timezone: options?.timeZone ?? "Europe/Kyiv",
      telegram_id: 0,
    },
    masterSlug: options?.master?.slug ?? undefined,
    customer: {
      name: booking.client_name,
      telegram_id: options?.telegramId ?? booking.client_telegram_id,
    },
    newStatus: "no_show",
  });
}

export async function sendBookingRescheduled(
  booking: BookingWithService,
  customer: { telegram_id?: number | null; name?: string },
  options?: { timeZone?: string; master?: Pick<Master, "business_name" | "timezone" | "slug"> },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: {
      business_name: options?.master?.business_name ?? "",
      timezone: options?.timeZone ?? "Europe/Kyiv",
      telegram_id: 0,
    },
    masterSlug: options?.master?.slug ?? undefined,
    customer: {
      name: customer.name ?? booking.client_name,
      telegram_id: customer.telegram_id,
    },
    newStatus: "rescheduled",
  });
}

export async function sendBookingRescheduledToMaster(
  booking: BookingWithService,
  master: {
    telegram_id: number;
    business_name: string;
    client_name: string;
  },
  options?: { timeZone?: string },
): Promise<void> {
  const timeZone = options?.timeZone ?? "Europe/Kyiv";
  const serviceName = getServiceName(booking);
  const dateTime = formatDateTime(booking.booking_start, timeZone);
  const text =
    `📅 *Запис перенесено*\n\n` +
    `Клієнт *${master.client_name}* переніс запис.\n\n` +
    `Послуга: *${serviceName}*\n` +
    `Новий час: ${dateTime}\n\n` +
    `👉 [Відкрити кабінет](${getMasterDashboardUrl()})\n\n` +
    SIGNATURE;
  await sendTelegramMessage(master.telegram_id, text);
}