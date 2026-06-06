import { NextResponse } from "next/server";
import { mergeCustomerProfiles } from "@/lib/client-profile";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";
import type { Customer } from "@/types";

export async function GET(request: Request) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) return authResult.error;

    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("telegram_id", authResult.user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const customers = (data ?? []) as Customer[];
    const merged = mergeCustomerProfiles(customers, authResult.user.id);

    return NextResponse.json({
      customer: {
        telegram_id: authResult.user.id,
        ...merged,
      },
      customers,
    });
  } catch (error) {
    console.error("[api/customers/me GET]", error);
    return serverError("Не вдалося завантажити клієнта");
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const name =
      body.name !== undefined ? String(body.name).trim() : undefined;
    const phone =
      body.phone === undefined
        ? undefined
        : body.phone === null
          ? null
          : String(body.phone).trim() || null;
    const avatarUrl =
      body.avatar_url === undefined
        ? undefined
        : body.avatar_url === null
          ? null
          : String(body.avatar_url).trim() || null;

    if (name !== undefined && name.length < 1) {
      return badRequest("Ім'я обов'язкове");
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("telegram_id", authResult.user.id);

    if (fetchError) throw fetchError;
    if (!existing?.length) {
      return badRequest(
        "Профіль ще не створено. Спочатку запишіться до майстра.",
      );
    }

    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    if (Object.keys(updates).length === 0) {
      return badRequest("Немає даних для оновлення");
    }

    const { data, error } = await supabaseAdmin
      .from("customers")
      .update(updates)
      .eq("telegram_id", authResult.user.id)
      .select("*");

    if (error) throw error;

    const customers = (data ?? []) as Customer[];
    const merged = mergeCustomerProfiles(customers, authResult.user.id);

    return NextResponse.json({
      customer: {
        telegram_id: authResult.user.id,
        ...merged,
      },
      customers,
    });
  } catch (error) {
    console.error("[api/customers/me PATCH]", error);
    return serverError("Не вдалося оновити профіль");
  }
}
