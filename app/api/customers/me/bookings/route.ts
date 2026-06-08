import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";
import type { BookingStatus, ClientBooking } from "@/types";

const BOOKING_SELECT =
  "id, master_id, service_id, booking_start, duration_minutes, status, services(id, name, price), masters(business_name, timezone, slug)";

export async function GET(request: Request) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("master_id");

    let query = supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("client_telegram_id", authResult.user.id)
      .order("booking_start", { ascending: false });

    if (masterId) {
      query = query.eq("master_id", masterId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const bookings: ClientBooking[] = (data ?? []).map((row) => {
      const servicesRaw = row.services as
        | { id: string; name: string; price: number }
        | { id: string; name: string; price: number }[]
        | null;
      const services = Array.isArray(servicesRaw)
        ? (servicesRaw[0] ?? null)
        : servicesRaw;
      const mastersRaw = row.masters as
        | { business_name: string; timezone: string; slug: string | null }
        | { business_name: string; timezone: string; slug: string | null }[]
        | null;
      const masters = Array.isArray(mastersRaw)
        ? (mastersRaw[0] ?? null)
        : mastersRaw;

      return {
        id: row.id as string,
        master_id: row.master_id as string,
        business_name: masters?.business_name ?? "Майстер",
        master_slug: masters?.slug ?? null,
        master_timezone: masters?.timezone ?? "Europe/Kyiv",
        service_id: (row.service_id as string | null) ?? services?.id ?? null,
        service_name: services?.name ?? null,
        service_price: services?.price ?? null,
        booking_start: row.booking_start as string,
        duration_minutes: row.duration_minutes as number,
        status: row.status as BookingStatus,
      };
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("[api/customers/me/bookings GET]", error);
    return serverError("Не вдалося завантажити записи");
  }
}
