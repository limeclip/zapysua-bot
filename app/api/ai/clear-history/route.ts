import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/response";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTelegramUserFromRequest } from "@/lib/telegram/auth";

type ClearHistoryBody = {
  masterId?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ClearHistoryBody;
    const masterId = String(body.masterId ?? "").trim();

    if (!masterId) {
      return badRequest("masterId обов'язковий");
    }

    const telegramAuth = getTelegramUserFromRequest(request);
    const clientTelegramId = telegramAuth?.user.id;

    let query = supabaseAdmin.from("ai_logs").delete().eq("master_id", masterId);

    if (clientTelegramId) {
      query = query.eq("client_telegram_id", clientTelegramId);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/ai/clear-history POST]", error);
    return serverError("Не вдалося очистити історію AI");
  }
}
