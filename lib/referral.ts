import type { Master } from "@/types";

export function getMasterStartParam(
  master: Pick<Master, "slug" | "id">
): string {
  return master.slug ?? `ref_${master.id}`;
}

export function getBotUsername(): string {
  return process.env.NEXT_PUBLIC_BOT_USERNAME || "ZapysUaBot";
}

export function getWebAppBaseUrl(): string {
  if (process.env.WEBAPP_URL) {
    return process.env.WEBAPP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

/**
 * Путь страницы клиента
 */
export function getClientAppPath(
  master: Pick<Master, "slug" | "id">
): string {
  return master.slug
    ? `/client/${master.slug}`
    : `/client/ref_${master.id}`;
}

/**
 * Прямой URL Mini App
 */
export function getClientAppUrl(
  master: Pick<Master, "slug" | "id">
): string {
  return `${getWebAppBaseUrl()}${getClientAppPath(master)}`;
}

/**
 * TELEGRAM MINI APP LINK
 *
 * ВАЖНО:
 * должен быть настроен short name "app" в BotFather
 *
 * Формат:
 * https://t.me/BOT/app?startapp=slug
 */
export function getClientStartAppLink(
  master: Pick<Master, "slug" | "id">
): string {
  const bot = getBotUsername();

  const param = getMasterStartParam(master);

  return `https://t.me/${bot}/app?startapp=${encodeURIComponent(param)}`;
}

/**
 * Старый fallback через /start
 */
export function getClientBotStartLink(
  master: Pick<Master, "slug" | "id">
): string {
  const bot = getBotUsername();

  const param = getMasterStartParam(master);

  return `https://t.me/${bot}?start=${encodeURIComponent(param)}`;
}