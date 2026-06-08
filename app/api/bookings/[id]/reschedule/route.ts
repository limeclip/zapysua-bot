import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { findOverlappingBooking } from "@/lib/bookings-server";
import {
  sendBookingRescheduled,
  sendBookingRescheduledToMaster,
} from "@/lib/notifications";
import {
  badRequest,
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";
import type { BookingWithService } from "@/types";

const BOOKING_SELECT = "*, services(id, name, price)";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const clientAuth = await requireTelegramUser(request);
    if ("error" in clientAuth) return clientAuth.error;

    const { id } = await context.params;
    const body = await request.json();
    const bookingStartRaw = body.booking_start as string | undefined;
    const serviceId = (body.service_id as string | undefined) ?? undefined;

    if (!bookingStartRaw) {
      return badRequest("Оберіть новий час");
    }

    const bookingStart = new Date(bookingStartRaw);
    if (Number.isNaN(bookingStart.getTime())) {
      return badRequest("Невірна дата або час");
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
      return badRequest("Цей запис не можна перенести");
    }

    const resolvedServiceId = serviceId ?? (existing.service_id as string);
    if (!resolvedServiceId) {
      return badRequest("Послугу не знайдено");
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id, duration_minutes, is_active")
      .eq("id", resolvedServiceId)
      .eq("master_id", existing.master_id)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service || !service.is_active) {
      return badRequest("Послугу не знайдено");
    }

    const durationMinutes = existing.duration_minutes as number;

    const hasOverlap = await findOverlappingBooking(
      existing.master_id as string,
      bookingStart,
      durationMinutes,
      id,
    );
    if (hasOverlap) {
      return badRequest("Цей час уже зайнятий. Оберіть інший слот.");
    }

    const previousNotes = existing.notes ? String(existing.notes) : "";
    const cancelNotes = previousNotes
      ? `${previousNotes}; перенесено`
      : "перенесено";

    const { error: cancelError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled", notes: cancelNotes })
      .eq("id", id);

    if (cancelError) throw cancelError;

    const { data: newBooking, error: createError } = await supabaseAdmin
      .from("bookings")
      .insert({
        master_id: existing.master_id,
        customer_id: existing.customer_id,
        client_telegram_id: existing.client_telegram_id,
        client_name: existing.client_name,
        client_phone: existing.client_phone,
        service_id: resolvedServiceId,
        booking_start: bookingStart.toISOString(),
        duration_minutes: durationMinutes,
        status: "pending",
        notes: "перенесено",
      })
      .select(BOOKING_SELECT)
      .single();

    if (createError) throw createError;

    const { data: masterInfo } = await supabaseAdmin
      .from("masters")
      .select("business_name, timezone, telegram_id")
      .eq("id", existing.master_id)
      .maybeSingle();

    const timeZone = masterInfo?.timezone ?? "Europe/Kyiv";

    try {
      await sendBookingRescheduled(
        newBooking as BookingWithService,
        { telegram_id: existing.client_telegram_id as number },
        { timeZone },
      );
      if (masterInfo?.telegram_id) {
        await sendBookingRescheduledToMaster(
          newBooking as BookingWithService,
          {
            telegram_id: masterInfo.telegram_id,
            business_name: masterInfo.business_name,
            client_name: existing.client_name as string,
          },
          { timeZone },
        );
      }
    } catch (notifyError) {
      console.error("[api/bookings reschedule] notification:", notifyError);
    }

    return NextResponse.json({ booking: newBooking });
  } catch (error) {
    console.error("[api/bookings/[id]/reschedule POST]", error);
    return serverError("Не вдалося перенести запис");
  }
}
