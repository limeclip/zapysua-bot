import crypto from "crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
};

export function parseInitDataUser(
  initData: string,
): TelegramWebAppUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) return null;
    return JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    return null;
  }
}

export function validateInitData(
  initData: string,
  botToken: string,
): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    const entries: [string, string][] = [];
    params.forEach((value, key) => {
      if (key !== "hash") entries.push([key, value]);
    });

    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return calculatedHash === hash;
  } catch {
    return false;
  }
}

export function getTelegramUserFromRequest(request: Request): {
  user: TelegramWebAppUser;
  initData: string;
} | null {
  const initData =
    request.headers.get("x-telegram-init-data") ??
    request.headers.get("X-Telegram-Init-Data");

  if (!initData) {
    if (process.env.NODE_ENV === "development") {
      const devId = request.headers.get("x-telegram-user-id");
      if (devId) {
        const id = parseInt(devId, 10);
        if (!Number.isNaN(id)) {
          return {
            initData: "",
            user: { id, first_name: "Dev" },
          };
        }
      }
    }
    return null;
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return null;

  if (!validateInitData(initData, botToken)) {
    return null;
  }

  const user = parseInitDataUser(initData);
  if (!user?.id) return null;

  return { user, initData };
}
