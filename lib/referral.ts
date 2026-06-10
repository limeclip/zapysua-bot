import type { Master } from "@/types";

export function getMasterStartParam(
  master: Pick<Master, "slug" | "id">
): string {

  const raw =
    master.slug ?? `ref_${master.id}`;

  return raw
    .toLowerCase()
    .replace(/\./g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

export function getBotUsername(): string {
  return process.env.NEXT_PUBLIC_BOT_USERNAME ?? "ZapysUaBot";
}

export function getWebAppBaseUrl(): string {
  if (process.env.WEBAPP_URL) return process.env.WEBAPP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getClientAppPath(master: Pick<Master, "slug" | "id">): string {
  return master.slug
    ? `/client/${master.slug}`
    : `/client/ref_${master.id}`;
}

/** Пряме HTTPS-посилання на сторінку клієнта (кнопка web_app у боті). */
export function getClientAppUrl(master: Pick<Master, "slug" | "id">): string {
  return `${getWebAppBaseUrl()}${getClientAppPath(master)}`;
}

/** Посилання для клієнта через Main Mini App (short name: app у BotFather). */
export function getClientStartAppLink(
  master: Pick<Master, "slug" | "id">,
): string {
  const bot = getBotUsername();
  const param = getMasterStartParam(master);
  return `https://t.me/${bot}/app?startapp=${encodeURIComponent(param)}`;
}


/**
 * OLD FALLBACK
 */
export function getClientBotStartLink(
  master: Pick<Master, "slug" | "id">
): string {
  const bot = getBotUsername();

  const param = getMasterStartParam(master);

  return `https://t.me/${bot}?start=${encodeURIComponent(param)}`;
}
