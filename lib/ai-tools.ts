import { findOverlappingBooking } from "@/lib/bookings-server";
import { getAvailableSlots } from "@/lib/booking-utils";
import { formatTime } from "@/lib/dates";
import {
  getMasterContext,
  invalidateMasterContextCache,
  type MasterContext,
} from "@/lib/ai-context";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateCustomerByPhone } from "@/lib/supabaseClient";
import { isMasterSubscriptionActive } from "@/lib/subscription-server";
import {
  dispatchNotification,
  notifyClientBookingStatusChange,
  notifyMasterNewBooking,
} from "@/lib/notifications";
import type {
  AiAction,
  AiActionBook,
  AiActionCancel,
  AiActionReschedule,
  AiActionShowServices,
  AiActionShowSlots,
  AiResponse,
} from "@/types/ai";
import type { BookingWithService } from "@/types";

const SLOT_STEP_MINUTES = 30;

const ACTION_JSON_PATTERN =
  /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*"action"\s*:\s*"[^"]+"(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}\s*$/;

export function parseAiResponse(rawText: string): AiResponse {
  const trimmed = rawText.trim();
  const match = trimmed.match(ACTION_JSON_PATTERN);

  if (!match) {
    return { reply: trimmed };
  }

  const jsonPart = match[0].trim();
  const reply = trimmed.slice(0, trimmed.length - jsonPart.length).trim();

  try {
    const parsed = JSON.parse(jsonPart) as Record<string, unknown>;
    const action = parseActionObject(parsed);
    if (!action) {
      return { reply: trimmed };
    }
    return { reply: reply || trimmed, action };
  } catch {
    return { reply: trimmed };
  }
}

function parseActionObject(raw: Record<string, unknown>): AiAction | null {
  const action = raw.action;
  if (typeof action !== "string") return null;

  switch (action) {
    case "show_services":
      return { action: "show_services" };
    case "show_slots": {
      const serviceId = raw.serviceId;
      const date = raw.date;
      if (typeof serviceId !== "string" || typeof date !== "string") return null;
      return { action: "show_slots", serviceId, date };
    }
    case "book": {
      const serviceId = raw.serviceId;
      const startTime = raw.startTime;
      if (typeof serviceId !== "string" || typeof startTime !== "string") {
        return null;
      }
      return { action: "book", serviceId, startTime };
    }
    case "cancel": {
      const bookingId = raw.bookingId;
      if (typeof bookingId !== "string") return null;
      return { action: "cancel", bookingId };
    }
    case "reschedule": {
      const bookingId = raw.bookingId;
      const newStartTime = raw.newStartTime;
      if (typeof bookingId !== "string" || typeof newStartTime !== "string") {
        return null;
      }
      return { action: "reschedule", bookingId, newStartTime };
    }
    default:
      return null;
  }
}

export function validateAction(
  action: AiAction,
  context: MasterContext,
  clientTelegramId?: string,
): string | null {
  switch (action.action) {
    case "show_services":
      return null;
    case "show_slots": {
      const service = context.services.find((s) => s.id === action.serviceId);
      if (!service) return "Послугу не знайдено";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(action.date)) {
        return "Невірний формат дати";
      }
      return null;
    }
    case "book": {
      const service = context.services.find((s) => s.id === action.serviceId);
      if (!service) return "Послугу не знайдено";
      if (Number.isNaN(new Date(action.startTime).getTime())) {
        return "Невірний час запису";
      }
      if (!clientTelegramId) return "Потрібен Telegram ID клієнта";
      return null;
    }
    case "cancel":
    case "reschedule": {
      const booking = context.clientBookings.find(
        (b) => b.id === action.bookingId,
      );
      if (!booking) return "Запис не знайдено або він не належить вам";
      if (action.action === "reschedule") {
        if (Number.isNaN(new Date(action.newStartTime).getTime())) {
          return "Невірний новий час";
        }
      }
      return null;
    }
    default:
      return "Невідома дія";
  }
}

export function formatServicesListText(context: MasterContext): string {
  if (context.services.length === 0) {
    return "Наразі немає активних послуг.";
  }

  return context.services
    .map(
      (service) =>
        `• ${service.name} — ${service.price} грн, ${service.duration_minutes} хв`,
    )
    .join("\n");
}

export async function getSlotsForAction(
  masterId: string,
  action: AiActionShowSlots,
  context: MasterContext,
): Promise<{ label: string; startTime: string }[]> {
  const service = context.services.find((s) => s.id === action.serviceId);
  if (!service) return [];

  const slots = await getAvailableSlots(
    masterId,
    action.date,
    service.duration_minutes,
    {
      workingHours: context.workingHours,
      timeZone: context.master.timezone,
      serviceId: action.serviceId,
      slotStepMinutes: SLOT_STEP_MINUTES,
    },
  );

  return slots.map((slot) => ({
    startTime: slot.start,
    label: formatTime(slot.start, context.master.timezone, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
}

async function resolveClientPhone(
  masterId: string,
  clientTelegramId: number,
): Promise<string | null> {
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("phone")
    .eq("master_id", masterId)
    .eq("telegram_id", clientTelegramId)
    .maybeSingle();

  if (customer?.phone) {
    return String(customer.phone);
  }

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("client_phone")
    .eq("master_id", masterId)
    .eq("client_telegram_id", clientTelegramId)
    .not("client_phone", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return booking?.client_phone ? String(booking.client_phone) : null;
}

export type ExecuteActionResult = {
  message: string;
  invalidateCache?: boolean;
};

export async function executeAiAction(params: {
  masterId: string;
  action: AiAction;
  clientTelegramId?: number;
  clientName?: string;
}): Promise<ExecuteActionResult> {
  const { masterId, action, clientTelegramId, clientName } = params;
  const context = await getMasterContext(
    masterId,
    clientTelegramId?.toString(),
  );

  if (!context) {
    return { message: "Майстра не знайдено." };
  }

  const validationError = validateAction(action, context, clientTelegramId?.toString());
  if (validationError) {
    return { message: validationError };
  }

  switch (action.action) {
    case "show_services":
      return {
        message: `Ось наші послуги:\n\n${formatServicesListText(context)}`,
      };

    case "show_slots": {
      const slots = await getSlotsForAction(masterId, action, context);
      if (slots.length === 0) {
        return {
          message: `На ${action.date} немає вільних слотів для цієї послуги.`,
        };
      }
      const lines = slots.map((slot) => `• ${slot.label}`).join("\n");
      return {
        message: `Вільні слоти на ${action.date}:\n\n${lines}`,
      };
    }

    case "book":
      return executeBookAction(
        masterId,
        action,
        context,
        clientTelegramId,
        clientName,
      );

    case "cancel":
      return executeCancelAction(masterId, action, clientTelegramId);

    case "reschedule":
      return executeRescheduleAction(
        masterId,
        action,
        context,
        clientTelegramId,
      );

    default:
      return { message: "Невідома дія." };
  }
}

async function executeBookAction(
  masterId: string,
  action: AiActionBook,
  context: MasterContext,
  clientTelegramId?: number,
  clientName?: string,
): Promise<ExecuteActionResult> {
  if (!clientTelegramId) {
    return { message: "Для запису потрібен Telegram-акаунт." };
  }

  const subscriptionActive = await isMasterSubscriptionActive(masterId);
  if (!subscriptionActive) {
    return {
      message:
        "Запис тимчасово недоступний. Зверніться безпосередньо до майстра.",
    };
  }

  const service = context.services.find((s) => s.id === action.serviceId);
  if (!service) {
    return { message: "Послугу не знайдено." };
  }

  const bookingStart = new Date(action.startTime);
  if (Number.isNaN(bookingStart.getTime())) {
    return { message: "Невірна дата або час." };
  }

  const hasOverlap = await findOverlappingBooking(
    masterId,
    bookingStart,
    service.duration_minutes,
  );
  if (hasOverlap) {
    return { message: "Цей час уже зайнятий. Оберіть інший слот." };
  }

  const phone = await resolveClientPhone(masterId, clientTelegramId);
  if (!phone) {
    return {
      message:
        "Для запису мені потрібен ваш номер телефону. Надішліть його у форматі +380XXXXXXXXX.",
    };
  }

  const name =
    clientName?.trim() ||
    `Клієнт ${clientTelegramId}`;

  const customer = await getOrCreateCustomerByPhone(
    masterId,
    name,
    phone,
    clientTelegramId,
  );

  const { data: master, error: masterError } = await supabaseAdmin
    .from("masters")
    .select("id, telegram_id, business_name, timezone, slug")
    .eq("id", masterId)
    .maybeSingle();

  if (masterError) throw masterError;
  if (!master) return { message: "Майстра не знайдено." };

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .insert({
      master_id: masterId,
      customer_id: customer.id,
      client_telegram_id: clientTelegramId,
      client_name: name,
      client_phone: phone,
      service_id: action.serviceId,
      booking_start: bookingStart.toISOString(),
      duration_minutes: service.duration_minutes,
      status: "pending",
      notes: "запис через AI-адміністратора",
    })
    .select("*, services(id, name, price)")
    .single();

  if (bookingError) throw bookingError;

  const bookingWithService = booking as BookingWithService;
  const masterInfo = {
    id: master.id,
    slug: master.slug ?? null,
    business_name: master.business_name ?? "",
    timezone: master.timezone ?? "Europe/Kyiv",
    telegram_id: master.telegram_id,
  };

  dispatchNotification(
    notifyMasterNewBooking({
      booking: bookingWithService,
      master: masterInfo,
      customer: { name, telegram_id: clientTelegramId },
    }),
  );
  dispatchNotification(
    notifyClientBookingStatusChange({
      booking: bookingWithService,
      master: masterInfo,
      customer: { name, telegram_id: clientTelegramId },
      newStatus: "created",
    }),
  );

  const when = formatTime(
    bookingStart.toISOString(),
    masterInfo.timezone,
    { dateStyle: "medium", timeStyle: "short" },
  );

  invalidateMasterContextCache(masterId);

  return {
    message: `Запис підтверджено!\n\nПослуга: ${service.name}\nЧас: ${when}\nСтатус: очікує підтвердження майстра.`,
    invalidateCache: true,
  };
}

async function executeCancelAction(
  masterId: string,
  action: AiActionCancel,
  clientTelegramId?: number,
): Promise<ExecuteActionResult> {
  if (!clientTelegramId) {
    return { message: "Для скасування потрібен Telegram-акаунт." };
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("id, status, master_id")
    .eq("id", action.bookingId)
    .eq("master_id", masterId)
    .eq("client_telegram_id", clientTelegramId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) return { message: "Запис не знайдено." };

  if (!["pending", "confirmed"].includes(existing.status)) {
    return { message: "Цей запис не можна скасувати." };
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", action.bookingId);

  if (error) throw error;

  invalidateMasterContextCache(masterId);

  return {
    message: "Запис успішно скасовано.",
    invalidateCache: true,
  };
}

async function executeRescheduleAction(
  masterId: string,
  action: AiActionReschedule,
  context: MasterContext,
  clientTelegramId?: number,
): Promise<ExecuteActionResult> {
  if (!clientTelegramId) {
    return { message: "Для перенесення потрібен Telegram-акаунт." };
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", action.bookingId)
    .eq("master_id", masterId)
    .eq("client_telegram_id", clientTelegramId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) return { message: "Запис не знайдено." };

  if (!["pending", "confirmed"].includes(existing.status)) {
    return { message: "Цей запис не можна перенести." };
  }

  const bookingStart = new Date(action.newStartTime);
  if (Number.isNaN(bookingStart.getTime())) {
    return { message: "Невірна дата або час." };
  }

  const durationMinutes = existing.duration_minutes as number;
  const hasOverlap = await findOverlappingBooking(
    masterId,
    bookingStart,
    durationMinutes,
    action.bookingId,
  );
  if (hasOverlap) {
    return { message: "Цей час уже зайнятий. Оберіть інший слот." };
  }

  const previousNotes = existing.notes ? String(existing.notes) : "";
  const cancelNotes = previousNotes
    ? `${previousNotes}; перенесено`
    : "перенесено";

  const { error: cancelError } = await supabaseAdmin
    .from("bookings")
    .update({ status: "cancelled", notes: cancelNotes })
    .eq("id", action.bookingId);

  if (cancelError) throw cancelError;

  const serviceId = existing.service_id as string;
  const { data: newBooking, error: createError } = await supabaseAdmin
    .from("bookings")
    .insert({
      master_id: masterId,
      customer_id: existing.customer_id,
      client_telegram_id: clientTelegramId,
      client_name: existing.client_name,
      client_phone: existing.client_phone,
      service_id: serviceId,
      booking_start: bookingStart.toISOString(),
      duration_minutes: durationMinutes,
      status: "pending",
      notes: "перенесено через AI-адміністратора",
    })
    .select("*, services(id, name, price)")
    .single();

  if (createError) throw createError;

  const when = formatTime(
    bookingStart.toISOString(),
    context.master.timezone,
    { dateStyle: "medium", timeStyle: "short" },
  );

  invalidateMasterContextCache(masterId);

  return {
    message: `Запис перенесено на ${when}. Статус: очікує підтвердження майстра.`,
    invalidateCache: true,
  };
}

export function formatClientBookingsText(context: MasterContext): string {
  if (context.clientBookings.length === 0) {
    return "У вас немає майбутніх записів.";
  }

  return context.clientBookings
    .map((booking) => {
      const service = context.services.find((s) => s.id === booking.service_id);
      const serviceName = service?.name ?? "Послуга";
      const when = formatTime(booking.booking_start, context.master.timezone, {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return `• ${serviceName} — ${when} (${booking.status})`;
    })
    .join("\n");
}

export function getAiHelpText(): string {
  return (
    "Я можу допомогти:\n\n" +
    "• Записатися на послугу\n" +
    "• Показати ціни та послуги\n" +
    "• Показати ваші записи\n" +
    "• Перенести або скасувати запис\n\n" +
    "Просто напишіть, що вам потрібно, або скористайтеся кнопками."
  );
}

export { SLOT_STEP_MINUTES };
