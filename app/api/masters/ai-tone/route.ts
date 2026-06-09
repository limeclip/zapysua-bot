import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireMasterWithSubscription,
  serverError,
} from "@/lib/api/response";
import type { AiTone } from "@/types";

const VALID_TONES: AiTone[] = ["friendly", "professional", "caring", "formal"];

export async function PATCH(request: Request) {
  try {
    const authResult = await requireMasterWithSubscription(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const tone = body.tone as AiTone;

    if (!tone || !VALID_TONES.includes(tone)) {
      return badRequest("Невірний тон AI");
    }

    const { error } = await supabaseAdmin
      .from("ai_settings")
      .upsert({
        master_id: authResult.master.id,
        tone,
      });

    if (error) throw error;

    return NextResponse.json({ success: true, tone });
  } catch (error) {
    console.error("[api/masters/ai-tone]", error);
    return serverError("Не вдалося оновити тон AI");
  }
}
