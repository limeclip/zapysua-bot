import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireMasterWithSubscription,
  serverError,
} from "@/lib/api/response";
import type { BookingStatus } from "@/types";

const VALID_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authResult = await requireMasterWithSubscription(request);
    if ("error" in authResult) return authResult.error;

    const { id } = await context.params;
    const body = await request.json();
    const status = body.status as BookingStatus | undefined;

    if (!status || !VALID_STATUSES.includes(status)) {
      return badRequest("Невірний статус");
    }

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .eq("master_id", authResult.master.id)
      .select("*, services(id, name, price)")
      .single();

    if (error) throw error;
    if (!data) return badRequest("Запис не знайдено");

    return NextResponse.json({ booking: data });
  } catch (error) {
    console.error("[api/bookings PATCH]", error);
    return serverError("Не вдалося оновити запис");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authResult = await requireMasterWithSubscription(request);
    if ("error" in authResult) return authResult.error;

    const { id } = await context.params;

    const { error } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", id)
      .eq("master_id", authResult.master.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/bookings DELETE]", error);
    return serverError("Не вдалося видалити запис");
  }
}
