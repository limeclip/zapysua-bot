import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireMasterWithSubscription,
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";
import {
  sendBookingCancelled,
  sendBookingConfirmation,
  sendBookingNoShow,
} from "@/lib/notifications";
import type { BookingStatus, BookingWithService } from "@/types";

const VALID_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

const BOOKING_SELECT = "*, services(id, name, price)";

type RouteContext = { params: Promise<{ id: string }> };

async function notifyStatusChange(
  booking: BookingWithService,
  newStatus: BookingStatus,
  timeZone: string,
): Promise<void> {
  if (!booking.client_telegram_id) return;

  const customer = { telegram_id: booking.client_telegram_id };

  if (newStatus === "confirmed") {
    await sendBookingConfirmation(booking, customer, { timeZone });
  } else if (newStatus === "cancelled") {
    await sendBookingCancelled(booking, {
      timeZone,
      telegramId: booking.client_telegram_id,
    });
  } else if (newStatus === "no_show") {
    await sendBookingNoShow(booking, {
      timeZone,
      telegramId: booking.client_telegram_id,
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const status = body.status as BookingStatus | undefined;

    if (!status || !VALID_STATUSES.includes(status)) {
      return badRequest("Невірний статус");
    }

    const masterAuth = await requireMasterWithSubscription(request);
    const isMasterBooking = !("error" in masterAuth);

    if (isMasterBooking) {
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("id", id)
        .eq("master_id", masterAuth.master.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing) return badRequest("Запис не знайдено");

      const { data, error } = await supabaseAdmin
        .from("bookings")
        .update({ status })
        .eq("id", id)
        .eq("master_id", masterAuth.master.id)
        .select(BOOKING_SELECT)
        .single();

      if (error) throw error;
      if (!data) return badRequest("Запис не знайдено");

      if (existing.status !== status) {
        const timeZone = masterAuth.master.timezone ?? "Europe/Kyiv";
        try {
          await notifyStatusChange(
            data as BookingWithService,
            status,
            timeZone,
          );
        } catch (notifyError) {
          console.error("[api/bookings PATCH] notification:", notifyError);
        }
      }

      return NextResponse.json({ booking: data });
    }

    const clientAuth = await requireTelegramUser(request);
    if ("error" in clientAuth) return clientAuth.error;

    if (status !== "cancelled") {
      return badRequest("Клієнт може лише скасувати запис");
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", id)
      .eq("client_telegram_id", clientAuth.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return badRequest("Запис не знайдено");

    if (!["pending", "confirmed"].includes(existing.status)) {
      return badRequest("Цей запис не можна скасувати");
    }

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("client_telegram_id", clientAuth.user.id)
      .select(BOOKING_SELECT)
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
