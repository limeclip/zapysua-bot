import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { findOverlappingBooking } from "@/lib/bookings-server";
import {
  badRequest,
  requireMasterWithSubscription,
  serverError,
  subscriptionRequired,
} from "@/lib/api/response";
import { normalizeUaPhone } from "@/lib/phone";
import { getTelegramUserFromRequest } from "@/lib/telegram/auth";
import { sendBookingCreated } from "@/lib/notifications";
import { isMasterSubscriptionActive } from "@/lib/subscription-server";
import { getOrCreateCustomerByPhone } from "@/lib/supabaseClient";
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
  customerId: string | null;
  clientName: string;
  clientPhone: string;
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
      customer_id: params.customerId,
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const clientName = String(body.client_name ?? "").trim();
    const clientPhoneRaw =
      body.client_phone === undefined || body.client_phone === null
        ? ""
        : String(body.client_phone).trim();
    const serviceId = body.service_id as string | undefined;
    const bookingStartRaw = body.booking_start as string | undefined;
    const notes =
      body.notes === undefined || body.notes === null
        ? null
        : String(body.notes).trim() || null;

    if (!clientName || clientName.length < 1) {
      return badRequest("Ім'я клієнта обов'язкове");
    }

    const clientPhone = normalizeUaPhone(clientPhoneRaw);
    if (!clientPhone) {
      return badRequest("Введіть коректний номер телефону");
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

    let masterId: string | undefined;

    if (isMasterBooking) {
      if ("error" in authResult) {
        return authResult.error as NextResponse;
      }
      masterId = authResult.master.id;
    } else {
      masterId = bodyMasterId;
    }

    if (!masterId) {
      return badRequest("master_id обов'язковий");
    }

    if (!isMasterBooking) {
      const subscriptionActive = await isMasterSubscriptionActive(masterId);
      if (!subscriptionActive) {
        return subscriptionRequired();
      }
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
      const bodyTelegramId = body.client_telegram_id;
      if (bodyTelegramId !== undefined && bodyTelegramId !== null) {
        clientTelegramId = Number(bodyTelegramId);
        if (!Number.isFinite(clientTelegramId)) {
          return badRequest("Невірний client_telegram_id");
        }
      }
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
    }

    const customer = await getOrCreateCustomerByPhone(
      masterId,
      clientName,
      clientPhone,
      clientTelegramId,
    );

    const data = await createBooking({
      masterId,
      customerId: customer.id,
      clientName,
      clientPhone,
      serviceId,
      bookingStart,
      durationMinutes,
      status,
      notes,
      clientTelegramId,
    });

    const { data: masterInfo } = await supabaseAdmin
      .from("masters")
      .select("business_name, timezone")
      .eq("id", masterId)
      .maybeSingle();

    if (clientTelegramId) {
      try {
        await sendBookingCreated(
          data as BookingWithService,
          { telegram_id: clientTelegramId, name: clientName },
          {
            business_name: masterInfo?.business_name ?? "",
            timezone: masterInfo?.timezone ?? "Europe/Kyiv",
          },
          { confirmedByMaster: isMasterBooking && status === "confirmed" },
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
