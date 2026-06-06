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
import { getTelegramUserFromRequest } from "@/lib/telegram/auth";
import { sendBookingCreated } from "@/lib/notifications";
import { getOrCreateCustomer } from "@/lib/supabaseClient";
import type { BookingStatus, BookingWithService } from "@/types";

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

async function createBooking(params: {
  masterId: string;
  clientName: string;
  clientPhone: string | null;
  serviceId: string;
  bookingStart: Date;
  durationMinutes: number;
  status: BookingStatus;
  notes: string | null;
  clientTelegramId?: number | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      master_id: params.masterId,
      client_telegram_id: params.clientTelegramId ?? null,
      client_name: params.clientName,
      client_phone: params.clientPhone,
      service_id: params.serviceId,
      booking_start: params.bookingStart.toISOString(),
      duration_minutes: params.durationMinutes,
      status: params.status,
      notes: params.notes,
    })
    .select(BOOKING_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function POST(request: Request) {
  try {
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

    if (!clientName || clientName.length < 1) {
      return badRequest("Ім'я клієнта обов'язкове");
    }
    if (!serviceId) {
      return badRequest("Оберіть послугу");
    }
    if (!bookingStartRaw) {
      return badRequest("Оберіть дату та час");
    }

    const bookingStart = new Date(bookingStartRaw);
    if (Number.isNaN(bookingStart.getTime())) {
      return badRequest("Невірна дата або час");
    }

    const authResult = await requireMasterWithSubscription(request);
    const bodyMasterId = body.master_id as string | undefined;
    const isMasterBooking = !("error" in authResult) && !bodyMasterId;

    const masterId = isMasterBooking
      ? authResult.master.id
      : bodyMasterId;

    if (!masterId) {
      return badRequest("master_id обов'язковий");
    }

    const status: BookingStatus = isMasterBooking
      ? ((body.status as BookingStatus | undefined) ?? "confirmed")
      : "pending";

    if (!VALID_STATUSES.includes(status)) {
      return badRequest("Невірний статус");
    }

    const { data: master, error: masterError } = await supabaseAdmin
      .from("masters")
      .select("id, is_active")
      .eq("id", masterId)
      .maybeSingle();

    if (masterError) throw masterError;
    if (!master?.is_active) {
      return badRequest("Майстра не знайдено");
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id, duration_minutes, is_active")
      .eq("id", serviceId)
      .eq("master_id", masterId)
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
      masterId,
      bookingStart,
      durationMinutes,
    );
    if (hasOverlap) {
      return badRequest("Цей час уже зайнятий. Оберіть інший слот.");
    }

    let clientTelegramId: number | null = null;

    if (isMasterBooking) {
      await upsertCustomerByPhone({
        masterId,
        name: clientName,
        phone: clientPhone,
      });
    } else {
      const telegramAuth = getTelegramUserFromRequest(request);
      const bodyTelegramId = body.telegram_id;
      clientTelegramId =
        telegramAuth?.user.id ??
        (bodyTelegramId !== undefined && bodyTelegramId !== null
          ? Number(bodyTelegramId)
          : null);

      if (
        clientTelegramId !== null &&
        !Number.isFinite(clientTelegramId)
      ) {
        return badRequest("Невірний telegram_id");
      }

      await getOrCreateCustomer(
        masterId,
        clientTelegramId,
        clientName,
        clientPhone,
      );
    }

    const data = await createBooking({
      masterId,
      clientName,
      clientPhone,
      serviceId,
      bookingStart,
      durationMinutes,
      status,
      notes,
      clientTelegramId,
    });

    if (!isMasterBooking) {
      const { data: masterInfo } = await supabaseAdmin
        .from("masters")
        .select("business_name, timezone")
        .eq("id", masterId)
        .maybeSingle();

      try {
        await sendBookingCreated(
          data as BookingWithService,
          { telegram_id: clientTelegramId, name: clientName },
          {
            business_name: masterInfo?.business_name ?? "",
            timezone: masterInfo?.timezone ?? "Europe/Kyiv",
          },
        );
      } catch (notifyError) {
        console.error("[api/bookings POST] notification:", notifyError);
      }
    }

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (error) {
    console.error("[api/bookings POST]", error);
    return serverError("Не вдалося створити запис");
  }
}
