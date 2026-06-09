import { NextResponse } from "next/server";
import { completeOnboarding } from "@/lib/api/masters";
import {
  badRequest,
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";
import type { AiTone, MasterCategory, OnboardingPayload } from "@/types";

const VALID_CATEGORIES: MasterCategory[] = [
  "beauty",
  "health",
  "education",
  "auto",
  "other",
];

const VALID_TONES: AiTone[] = ["friendly", "professional", "caring", "formal"];

export async function POST(request: Request) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) return authResult.error;

    const body = (await request.json()) as Partial<OnboardingPayload>;

    if (body.telegram_id && body.telegram_id !== authResult.user.id) {
      return badRequest("telegram_id не збігається з авторизацією");
    }

    if (!body.business_name?.trim()) {
      return badRequest("Назва бізнесу обов'язкова");
    }

    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return badRequest("Невірна категорія");
    }

    if (!body.tone || !VALID_TONES.includes(body.tone)) {
      return badRequest("Невірний тон AI");
    }

    await completeOnboarding({
      telegram_id: authResult.user.id,
      username: body.username ?? authResult.user.username,
      business_name: body.business_name.trim(),
      category: body.category,
      location: body.location?.trim() || null,
      tone: body.tone,
      logo_url: body.logo_url ?? null,
      skip_trial: body.skip_trial === true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/onboarding]", error);
    return serverError("Не вдалося завершити онбординг");
  }
}
