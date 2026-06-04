import type { Master } from "@/types";

export function getMasterStartParam(
  master: Pick<Master, "slug" | "id">,
): string {
  return master.slug ?? `ref_${master.id}`;
}

export function getBotUsername(): string {
  return process.env.NEXT_PUBLIC_BOT_USERNAME ?? "ZapysUaBot";
}

export function getReferralLink(
  master: Pick<Master, "slug" | "id">,
  botUsername?: string,
): string {
  const bot = botUsername ?? getBotUsername();
  return `https://t.me/${bot}?start=${getMasterStartParam(master)}`;
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
