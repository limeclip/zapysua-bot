import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireMaster,
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const telegramIdRaw = searchParams.get("telegram_id");

    if (!telegramIdRaw) {
      return badRequest("telegram_id обов'язковий");
    }

    const telegramId = Number(telegramIdRaw);
    if (!Number.isFinite(telegramId)) {
      return badRequest("Невірний telegram_id");
    }

    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("master_id", authResult.master.id)
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ customer: data ?? null });
  } catch (error) {
    console.error("[api/customers GET]", error);
    return serverError("Не вдалося знайти клієнта");
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const masterId = body.master_id as string | undefined;
    const name = String(body.name ?? "").trim();
    const phone =
      body.phone === undefined || body.phone === null
        ? null
        : String(body.phone).trim() || null;

    if (!masterId) {
      return badRequest("master_id обов'язковий");
    }
    if (name.length < 1) {
      return badRequest("Ім'я клієнта обов'язкове");
    }

    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("master_id", masterId)
      .eq("telegram_id", authResult.user.id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("customers")
        .update({ name, phone })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ customer: data });
    }

    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert({
        master_id: masterId,
        telegram_id: authResult.user.id,
        name,
        phone,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ customer: data }, { status: 201 });
  } catch (error) {
    console.error("[api/customers POST]", error);
    return serverError("Не вдалося зберегти клієнта");
  }
}
