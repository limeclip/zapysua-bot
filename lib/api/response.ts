import { NextResponse } from "next/server";
import { getTelegramUserFromRequest } from "@/lib/telegram/auth";
import type { TelegramWebAppUser } from "@/lib/telegram/auth";
import { getMasterByTelegramId } from "@/lib/api/masters";
import type { Master, MasterWithMeta } from "@/types";
import { getMasterWithMeta } from "@/lib/api/masters";
import { isSubscriptionActive } from "@/lib/subscription";

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

export function subscriptionRequired() {
  return NextResponse.json(
    {
      error: "Підписка закінчилась. Оплатіть доступ.",
      code: "subscription_required",
    },
    { status: 403 },
  );
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

export async function requireMasterWithSubscription(
  request: Request,
): Promise<
  | { user: TelegramWebAppUser; master: Master; masterMeta: MasterWithMeta }
  | ApiError
> {
  const authResult = await requireTelegramUser(request);
  if ("error" in authResult) {
    return authResult;
  }

  const masterMeta = await getMasterWithMeta(authResult.user.id);
  if (!masterMeta) {
    return { error: badRequest("Майстра не знайдено. Пройдіть онбординг.") };
  }

  if (!isSubscriptionActive(masterMeta.subscription)) {
    return { error: subscriptionRequired() };
  }

  return {
    user: authResult.user,
    master: masterMeta,
    masterMeta,
  };
}
