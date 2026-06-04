import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  findOverlappingBooking,
  upsertCustomerByPhone,
} from "@/lib/bookings-server";
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

export async function POST(request: Request) {
  try {
    const authResult = await requireMasterWithSubscription(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const clientName = String(body.client_name ?? "").trim();
    const clientPhone =
      body.client_phone === undefined || body.client_phone === null
        ? null
        : String(body.client_phone).trim() || null;
    const serviceId = body.service_id as string | undefined;
    const bookingStartRaw = body.booking_start as string | undefined;
    const notes =
      body.notes === undefined || body.notes === null
        ? null
        : String(body.notes).trim() || null;
    const status = (body.status as BookingStatus | undefined) ?? "confirmed";

    if (!clientName || clientName.length < 1) {
      return badRequest("Ім'я клієнта обов'язкове");
    }
    if (!serviceId) {
      return badRequest("Оберіть послугу");
    }
    if (!bookingStartRaw) {
      return badRequest("Оберіть дату та час");
    }
    if (!VALID_STATUSES.includes(status)) {
      return badRequest("Невірний статус");
    }

    const bookingStart = new Date(bookingStartRaw);
    if (Number.isNaN(bookingStart.getTime())) {
      return badRequest("Невірна дата або час");
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id, duration_minutes, is_active")
      .eq("id", serviceId)
      .eq("master_id", authResult.master.id)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service || !service.is_active) {
      return badRequest("Послугу не знайдено");
    }

    const durationMinutes =
      body.duration_minutes !== undefined
        ? parseInt(String(body.duration_minutes), 10)
        : service.duration_minutes;

    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      return badRequest("Невірна тривалість");
    }

    const hasOverlap = await findOverlappingBooking(
      authResult.master.id,
      bookingStart,
      durationMinutes,
    );
    if (hasOverlap) {
      return badRequest("Цей час уже зайнятий. Оберіть інший слот.");
    }

    await upsertCustomerByPhone({
      masterId: authResult.master.id,
      name: clientName,
      phone: clientPhone,
    });

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        master_id: authResult.master.id,
        client_name: clientName,
        client_phone: clientPhone,
        service_id: serviceId,
        booking_start: bookingStart.toISOString(),
        duration_minutes: durationMinutes,
        status,
        notes,
      })
      .select(BOOKING_SELECT)
      .single();

    if (error) throw error;

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (error) {
    console.error("[api/bookings POST]", error);
    return serverError("Не вдалося створити запис");
  }
}
