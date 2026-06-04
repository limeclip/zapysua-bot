import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTelegramUser, serverError } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) return authResult.error;

    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("telegram_id", authResult.user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ customer: data ?? null });
  } catch (error) {
    console.error("[api/customers/me GET]", error);
    return serverError("Не вдалося завантажити клієнта");
  }
}
