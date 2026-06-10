import { bot } from "@/lib/bot";
import { formatDateKey, formatDateLong, formatTime } from "@/lib/dates";
import { getClientStartAppLink, getMasterDashboardDeepLink, getWebAppBaseUrl } from "@/lib/referral";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  BookingStatus,
  BookingWithService,
  Customer,
  Master,
  Service,
} from "@/types";

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


export function getMasterDashboardUrl(): string {
  return getWebAppBaseUrl();
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

function getClientLink(master: Pick<Master, "slug" | "id">): string {
  return getClientStartAppLink(master);
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

  if (error) {
    console.error("[notifications] logNotification:", error);
  }
}

export async function sendTelegramMessage(
  telegramId: number,
  text: string,
): Promise<boolean> {
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
  task.catch((error) => {
    console.error("[notifications] dispatch:", error);
  });
}

type NotifyMaster = Pick<
  Master,
  "business_name" | "timezone" | "telegram_id" | "slug" | "id"
>;

type NotifyContext = {
  booking: BookingWithService;
  master: NotifyMaster;
  customer: Pick<Customer, "name" | "telegram_id"> | { name: string; telegram_id?: number | null };
  service?: Pick<Service, "name"> | null;
};

function buildContext(params: NotifyContext, timeZone?: string) {
  const tz = timeZone ?? params.master.timezone ?? "Europe/Kyiv";
  const serviceName = getServiceName(params.booking, params.service);
  const dateTime = formatDateTime(params.booking.booking_start, tz);
  const clientLink = getClientLink(params.master);
  return { serviceName, dateTime, timeZone: tz, clientLink };
}

export async function notifyMasterNewBooking(params: NotifyContext): Promise<void> {
  const { serviceName, dateTime } = buildContext(params);
  const clientName = escapeMarkdown(params.customer.name);
  const safeService = escapeMarkdown(serviceName);
  const dashboardLink = getMasterDashboardDeepLink();
  
  const text =
    `📝 *Новий запис*\n\n` +
    `Клієнт *${clientName}* записався на *${safeService}*, ${dateTime}.\n\n` +
    `Будь ласка, підтвердіть або скасуйте запис у кабінеті.\n\n` +
    `👉 [Відкрити кабінет](${dashboardLink})` +
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

  const { serviceName, dateTime, clientLink } = buildContext(params);
  const masterName = escapeMarkdown(params.master.business_name);
  const safeService = escapeMarkdown(serviceName);

  let text: string;
  let logType: NotificationType | null = null;

  switch (params.newStatus) {
    case "created":
      text =
        `📝 *Запис створено*\n\n` +
        `Ви записалися на *${safeService}*, ${dateTime}.\n` +
        `Очікуйте підтвердження від майстра.\n\n` +
        `👉 [Мої записи](${clientLink})\n\n` +
        SIGNATURE;
      break;
    case "created_confirmed":
      text =
        `✅ *Запис підтверджено*\n\n` +
        `Ваш запис на *${safeService}*, ${dateTime} підтверджено майстром *${masterName}*!\n\n` +
        `👉 [Мої записи](${clientLink})\n\n` +
        SIGNATURE;
      break;
    case "confirmed":
      text =
        `✅ *Запис підтверджено*\n\n` +
        `Ваш запис на *${safeService}*, ${dateTime} підтверджено!\n` +
        `Ми нагадаємо про візит за 24 години.\n\n` +
        `👉 [Мої записи](${clientLink})\n\n` +
        SIGNATURE;
      logType = "confirmation";
      break;
    case "cancelled":
      text =
        `❌ *Запис скасовано*\n\n` +
        `Ваш запис на *${safeService}*, ${dateTime} скасовано майстром.\n` +
        `Будь ласка, зверніться до майстра для уточнення.\n\n` +
        `👉 [Мої записи](${clientLink})\n\n` +
        SIGNATURE;
      break;
    case "no_show":
      text =
        `⚠️ *Вас не було на записі*\n\n` +
        `На жаль, ви не з'явилися на запис *${safeService}*, ${dateTime}.\n` +
        `Якщо це помилка, зв'яжіться з майстром.\n\n` +
        `👉 [Мої записи](${clientLink})\n\n` +
        SIGNATURE;
      break;
    case "rescheduled":
      text =
        `📅 *Запис перенесено*\n\n` +
        `Новий час: *${safeService}*, ${dateTime}.\n` +
        `Очікуйте підтвердження від майстра.\n\n` +
        `👉 [Мої записи](${clientLink})\n\n` +
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
  options: {
    timeZone?: string;
    masterSlug?: string | null;
    masterId: string;
  },
): Promise<boolean> {
  const timeZone = options.timeZone ?? "Europe/Kyiv";
  const serviceName = escapeMarkdown(getServiceName(booking));
  const dateTime = formatDateTime(booking.booking_start, timeZone);
  const clientLink = getClientStartAppLink({
    slug: options.masterSlug ?? null,
    id: options.masterId,
  });

  const text =
    type === "reminder_24h"
      ? `🔔 *Нагадування*\n\n` +
        `Завтра у вас запис: *${serviceName}*, ${dateTime}.\n` +
        `Будь ласка, скасуйте або перенесіть, якщо щось змінилося.\n\n` +
        // `Якщо щось змінилося, ви можете скасувати або перенести запис.\n\n` +
        `👉 [Мої записи](${clientLink})\n\n` +
        SIGNATURE
      : `⏰ *Нагадування*\n\n` +
        `Через 2 години у вас запис: *${serviceName}*, ${dateTime}.\n` +
        `До зустрічі!\n\n` +
        `👉 [Мої записи](${clientLink})\n\n` +
        SIGNATURE;

  const sent = await sendTelegramMessage(telegramId, text);
  await logNotification(booking.id, type, sent ? "sent" : "failed");
  return sent;
}

export async function sendThankYouMessage(
  booking: BookingWithService,
  telegramId: number,
  master: Pick<Master, "slug" | "id">,
): Promise<boolean> {
  const clientLink = getClientStartAppLink(master);

  const text =
    `❤️ *Дякуємо за візит!*\n\n` +
    `Будемо раді бачити вас знову.\n\n` +
    `👉 [Записатися знову](${clientLink})\n\n` +
    SIGNATURE;

  const sent = await sendTelegramMessage(telegramId, text);
  await logNotification(booking.id, "thank_you", sent ? "sent" : "failed");
  return sent;
}

export async function sendReturnClientMessage(
  booking: BookingWithService,
  telegramId: number,
  master: Pick<Master, "slug" | "id" | "business_name">,
): Promise<boolean> {
  const masterName = escapeMarkdown(master.business_name);
  const clientLink = getClientStartAppLink(master);

  const text =
    `🌷 *Давно не бачились!*\n\n` +
    `Скучаємо за вами у *${masterName}*.\n` +
    `Запишіться на нову зустріч — будемо раді вас бачити!\n\n` +
    `👉 [Записатися](${clientLink})\n\n` +
    SIGNATURE;

  const sent = await sendTelegramMessage(telegramId, text);
  await logNotification(booking.id, "return_client", sent ? "sent" : "failed");
  return sent;
}

// --- Зворотна сумісність (делегують до нових функцій) ---

export async function sendBookingCreated(
  booking: BookingWithService,
  customer: Pick<Customer, "telegram_id" | "name"> | { telegram_id?: number | null; name: string },
  master: Pick<Master, "business_name" | "timezone" | "slug" | "id">,
  options?: { confirmedByMaster?: boolean },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: { ...master, telegram_id: 0 },
    customer,
    newStatus: options?.confirmedByMaster ? "created_confirmed" : "created",
  });
}

export async function sendBookingConfirmation(
  booking: BookingWithService,
  customer: Pick<Customer, "telegram_id" | "name"> | { telegram_id?: number | null; name: string },
  options?: {
    timeZone?: string;
    master?: Pick<Master, "business_name" | "timezone" | "slug" | "id">;
  },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: {
      business_name: options?.master?.business_name ?? "",
      timezone: options?.timeZone ?? options?.master?.timezone ?? "Europe/Kyiv",
      telegram_id: 0,
      slug: options?.master?.slug ?? null,
      id: options?.master?.id ?? booking.master_id,
    },
    customer,
    newStatus: "confirmed",
  });
}

export async function sendBookingCancelled(
  booking: BookingWithService,
  options?: {
    timeZone?: string;
    telegramId?: number | null;
    master?: Pick<Master, "business_name" | "timezone" | "slug" | "id">;
  },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: {
      business_name: options?.master?.business_name ?? "",
      timezone: options?.timeZone ?? "Europe/Kyiv",
      telegram_id: 0,
      slug: options?.master?.slug ?? null,
      id: options?.master?.id ?? booking.master_id,
    },
    customer: {
      name: booking.client_name,
      telegram_id: options?.telegramId ?? booking.client_telegram_id,
    },
    newStatus: "cancelled",
  });
}

export async function sendBookingNoShow(
  booking: BookingWithService,
  options?: {
    timeZone?: string;
    telegramId?: number | null;
    master?: Pick<Master, "business_name" | "timezone" | "slug" | "id">;
  },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: {
      business_name: options?.master?.business_name ?? "",
      timezone: options?.timeZone ?? "Europe/Kyiv",
      telegram_id: 0,
      slug: options?.master?.slug ?? null,
      id: options?.master?.id ?? booking.master_id,
    },
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
  options?: {
    timeZone?: string;
    master?: Pick<Master, "business_name" | "timezone" | "slug" | "id">;
  },
): Promise<void> {
  await notifyClientBookingStatusChange({
    booking,
    master: {
      business_name: options?.master?.business_name ?? "",
      timezone: options?.timeZone ?? "Europe/Kyiv",
      telegram_id: 0,
      slug: options?.master?.slug ?? null,
      id: options?.master?.id ?? booking.master_id,
    },
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
  const serviceName = escapeMarkdown(getServiceName(booking));
  const dateTime = formatDateTime(booking.booking_start, timeZone);
  const clientName = escapeMarkdown(master.client_name);

  const text =
    `📅 *Запис перенесено*\n\n` +
    `Клієнт *${clientName}* переніс запис.\n\n` +
    `Послуга: *${serviceName}*\n` +
    `Новий час: ${dateTime}\n\n` +
    `👉 [Відкрити кабінет](${getMasterDashboardUrl()})\n\n` +
    SIGNATURE;

  await sendTelegramMessage(master.telegram_id, text);
}
