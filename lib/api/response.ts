import { NextResponse } from "next/server";
import { getTelegramUserFromRequest } from "@/lib/telegram/auth";
import type { TelegramWebAppUser } from "@/lib/telegram/auth";
import { getMasterByTelegramId } from "@/lib/api/masters";
import type { Master } from "@/types";

export function unauthorized() {
  return NextResponse.json(
    { error: "Не авторизовано. Відкрийте через Telegram." },
    { status: 401 },
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message = "Внутрішня помилка сервера") {
  return NextResponse.json({ error: message }, { status: 500 });
}

type ApiError = { error: NextResponse<{ error: string }> };

export async function requireTelegramUser(
  request: Request,
): Promise<{ user: TelegramWebAppUser } | ApiError> {
  const auth = getTelegramUserFromRequest(request);
  if (!auth) {
    return { error: unauthorized() };
  }
  return { user: auth.user };
}

export async function requireMaster(
  request: Request,
): Promise<{ user: TelegramWebAppUser; master: Master } | ApiError> {
  const authResult = await requireTelegramUser(request);
  if ("error" in authResult) {
    return authResult;
  }

  const master = await getMasterByTelegramId(authResult.user.id);
  if (!master) {
    return { error: badRequest("Майстра не знайдено. Пройдіть онбординг.") };
  }

  return { user: authResult.user, master };
}
