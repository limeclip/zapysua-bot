import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  attachBookingStats,
  type CustomerWithStats,
} from "@/lib/customers-server";
import {
  badRequest,
  requireMaster,
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";
import type { Customer } from "@/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const telegramIdRaw = searchParams.get("telegram_id");

    if (telegramIdRaw) {
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
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    );
    const search = (searchParams.get("search") ?? "").trim();
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("customers")
      .select("*", { count: "exact" })
      .eq("master_id", authResult.master.id)
      .order("updated_at", { ascending: false });

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(
        `name.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
      );
    }

    const { data: customers, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) throw error;

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("client_telegram_id, client_phone, booking_start, status")
      .eq("master_id", authResult.master.id);

    if (bookingsError) throw bookingsError;

    const customersWithStats = attachBookingStats(
      (customers ?? []) as Customer[],
      bookings ?? [],
    );

    const total = count ?? 0;

    return NextResponse.json({
      customers: customersWithStats as CustomerWithStats[],
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[api/customers GET]", error);
    return serverError("Не вдалося завантажити клієнтів");
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
