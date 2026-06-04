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

const BOOKING_SELECT =
  "*, services(id, name, price)";

export async function GET(request: Request) {
  try {
    const authResult = await requireMasterWithSubscription(request);
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("master_id", authResult.master.id)
      .order("booking_start", { ascending: true });

    if (startDate) {
      query = query.gte("booking_start", startDate);
    }
    if (endDate) {
      query = query.lte("booking_start", endDate);
    }
    if (status && status !== "all") {
      if (!VALID_STATUSES.includes(status as BookingStatus)) {
        return badRequest("Невірний статус");
      }
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ bookings: data ?? [] });
  } catch (error) {
    console.error("[api/bookings GET]", error);
    return serverError("Не вдалося завантажити записи");
  }
}
