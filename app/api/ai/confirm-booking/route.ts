import { NextResponse } from "next/server";
import { confirmPendingBooking } from "@/lib/ai-tools";
import { badRequest, serverError } from "@/lib/api/response";
import { getTelegramUserFromRequest } from "@/lib/telegram/auth";
import type { PendingBooking } from "@/types/ai";

type ConfirmBookingRequestBody = {
  pendingBooking?: PendingBooking;
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ConfirmBookingRequestBody;
    const pendingBooking = body.pendingBooking;

    if (
      !pendingBooking?.masterId ||
      !pendingBooking?.serviceId ||
      !pendingBooking?.startTime
    ) {
      return badRequest("Невірні дані для підтвердження запису");
    }

    const telegramAuth = getTelegramUserFromRequest(request);
    const clientTelegramId = telegramAuth?.user.id;

    if (!clientTelegramId) {
      return badRequest("Потрібна авторизація через Telegram");
    }

    const result = await confirmPendingBooking({
      pendingBooking,
      clientTelegramId,
    });

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error("[api/ai/confirm-booking POST]", error);
    return serverError("Не вдалося підтвердити запис");
  }
}
