import type { Master } from "@/types";

export function getMasterStartParam(
  master: Pick<Master, "slug" | "id">,
): string {
  return master.slug ?? `ref_${master.id}`;
}

export function getBotUsername(): string {
  return process.env.NEXT_PUBLIC_BOT_USERNAME ?? "ZapysUaBot";
}

/** Посилання t.me/start?startapp= — відкриває Mini App напряму (без /start у чаті). */
export function getClientDeepLink(
  master: Pick<Master, "slug" | "id">,
  botUsername?: string,
): string {
  const bot = botUsername ?? getBotUsername();
  const param = getMasterStartParam(master);
  return `https://t.me/${bot}/start?startapp=${encodeURIComponent(param)}`;
}

/** URL Web App для кнопки webApp у боті (редирект через /start). */
export function getClientWebAppEntryUrl(
  master: Pick<Master, "slug" | "id">,
): string {
  const param = getMasterStartParam(master);
  return `${getWebAppBaseUrl()}/start?startapp=${encodeURIComponent(param)}`;
}

/** @deprecated Використовуйте getClientDeepLink */
export function getReferralLink(
  master: Pick<Master, "slug" | "id">,
  botUsername?: string,
): string {
  return getClientDeepLink(master, botUsername);
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

export function getClientAppUrl(master: Pick<Master, "slug" | "id">): string {
  return `${getWebAppBaseUrl()}${getClientAppPath(master)}`;
}
