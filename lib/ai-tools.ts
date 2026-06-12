import { findOverlappingBooking } from "@/lib/bookings-server";
import {
  getAvailableSlots,
  resolveBookingStartTime,
  resolvedTimeMatchesRequest,
  extractRequestedLocalTime,
  TIME_RESOLUTION_ERROR,
} from "@/lib/booking-utils";
import {
  formatDateKey,
  formatDateLongWithWeekday,
  formatDateTime,
  minutesToTime,
  parseTimeToMinutes,
} from "@/lib/dates";
import {
  formatWorkingDaysList,
  isWorkingDay,
} from "@/lib/working-hours";
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
  AiActionShowSlots,
  AiResponse,
  PendingBooking,
} from "@/types/ai";
import type { BookingWithService } from "@/types";

const ACTION_JSON_PATTERN =
  /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*"action"\s*:\s*"[^"]+"(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}\s*$/;

function logAiAction(
  tag: "SHOW_SLOTS" | "BOOK" | "CONFIRM_BOOKING",
  data: Record<string, unknown>,
): void {
  console.log(`[${tag}]`, JSON.stringify(data));
}

function resolveBookDateAndTime(
  action: Pick<AiActionBook, "date" | "requestedTime" | "startTime">,
  timeZone: string,
): { dateKey: string | null; requestedTime: string | null } {
  if (action.date && /^\d{4}-\d{2}-\d{2}$/.test(action.date)) {
    const requestedTime = action.requestedTime
      ? minutesToTime(parseTimeToMinutes(action.requestedTime))
      : action.startTime
        ? extractRequestedLocalTime(action.startTime)
        : null;
    return { dateKey: action.date, requestedTime };
  }

  if (action.startTime) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(action.startTime)) {
      return { dateKey: action.startTime, requestedTime: null };
    }
    return {
      dateKey: formatDateKey(new Date(action.startTime), timeZone),
      requestedTime: extractRequestedLocalTime(action.startTime),
    };
  }

  return { dateKey: null, requestedTime: null };
}

function getDayOffMessage(dateKey: string, context: MasterContext): string {
  const dateFormatted = formatDateLongWithWeekday(
    dateKey,
    context.master.timezone,
  );
  const workingDays = formatWorkingDaysList(context.workingHours);
  return `На жаль, ${dateFormatted} – вихідний день. Робочі дні: ${workingDays}. Будь ласка, оберіть іншу дату.`;
}

function formatAvailableSlotsMessage(
  dateKey: string,
  context: MasterContext,
  slotTimes: string[],
): string {
  const dateFormatted = formatDateLongWithWeekday(
    dateKey,
    context.master.timezone,
  );
  if (slotTimes.length === 0) {
    return `На ${dateFormatted} немає вільних слотів для цієї послуги.`;
  }
  const lines = slotTimes.map((time) => `• ${time}`).join("\n");
  return `Вільні слоти на ${dateFormatted}:\n\n${lines}`;
}

export function parseAiResponse(rawText: string): AiResponse {
  const trimmed = rawText.trim();
  const match = trimmed.match(ACTION_JSON_PATTERN);

  if (!match) {
    return { reply: trimmed };
  }

  const jsonPart = match[0].trim();
  const reply = trimmed.replace(jsonPart, "").trim();

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
      const date = raw.date;
      const requestedTime = raw.requestedTime;
      if (typeof serviceId !== "string") return null;
      if (typeof date === "string" && typeof requestedTime === "string") {
        return {
          action: "book",
          serviceId,
          date,
          requestedTime,
          startTime: typeof startTime === "string" ? startTime : undefined,
        };
      }
      if (typeof startTime === "string") {
        return { action: "book", serviceId, startTime };
      }
      return null;
    }
    case "cancel": {
      const bookingId = raw.bookingId;
      if (typeof bookingId !== "string") return null;
      return { action: "cancel", bookingId };
    }
    case "reschedule": {
      const bookingId = raw.bookingId;
      const newStartTime = raw.newStartTime;
      const date = raw.date;
      const requestedTime = raw.requestedTime;
      if (typeof bookingId !== "string") return null;
      if (typeof date === "string" && typeof requestedTime === "string") {
        return {
          action: "reschedule",
          bookingId,
          date,
          requestedTime,
          newStartTime:
            typeof newStartTime === "string" ? newStartTime : undefined,
        };
      }
      if (typeof newStartTime === "string") {
        return { action: "reschedule", bookingId, newStartTime };
      }
      return null;
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
      const { dateKey, requestedTime } = resolveBookDateAndTime(
        action,
        context.master.timezone,
      );
      if (!dateKey || !requestedTime) {
        return "Потрібні дата (YYYY-MM-DD) та час (HH:MM)";
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
        const { dateKey, requestedTime } = resolveBookDateAndTime(
          {
            date: action.date,
            requestedTime: action.requestedTime,
            startTime: action.newStartTime,
          },
          context.master.timezone,
        );
        if (!dateKey || !requestedTime) {
          return "Потрібні дата (YYYY-MM-DD) та час (HH:MM)";
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
  const slots = await getAvailableSlots(masterId, action.date, action.serviceId);
  return slots.map((slot) => ({
    startTime: slot.startTime,
    label: slot.time,
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
  pendingBooking?: PendingBooking;
};

export async function executeAiAction(params: {
  masterId: string;
  action: AiAction;
  clientTelegramId?: number;
  clientName?: string;
  userMessage?: string;
}): Promise<ExecuteActionResult> {
  const { masterId, action, clientTelegramId, clientName, userMessage } = params;
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
      if (!isWorkingDay(action.date, context.workingHours, context.master.timezone)) {
        return {
          message: getDayOffMessage(action.date, context),
        };
      }

      const slots = await getAvailableSlots(masterId, action.date, action.serviceId);
      logAiAction("SHOW_SLOTS", {
        userInput: userMessage,
        masterId,
        serviceId: action.serviceId,
        date: action.date,
        timezone: context.master.timezone,
        availableSlots: slots,
      });
      return {
        message: formatAvailableSlotsMessage(
          action.date,
          context,
          slots.map((slot) => slot.time),
        ),
      };
    }

    case "book":
      return prepareBookAction(
        masterId,
        action,
        context,
        clientTelegramId,
        clientName,
        userMessage,
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

async function prepareBookAction(
  masterId: string,
  action: AiActionBook,
  context: MasterContext,
  clientTelegramId?: number,
  clientName?: string,
  userMessage?: string,
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

  const { dateKey, requestedTime } = resolveBookDateAndTime(
    action,
    context.master.timezone,
  );

  if (!dateKey || !requestedTime) {
    return { message: "Потрібні дата та час для запису." };
  }

  if (!isWorkingDay(dateKey, context.workingHours, context.master.timezone)) {
    return { message: getDayOffMessage(dateKey, context) };
  }

  const availableSlots = await getAvailableSlots(
    masterId,
    dateKey,
    action.serviceId,
  );

  const resolvedStartTime = resolveBookingStartTime(
    dateKey,
    context.master.timezone,
    availableSlots,
    requestedTime,
    action.startTime,
  );

  logAiAction("BOOK", {
    userInput: userMessage,
    requestedDate: dateKey,
    requestedTime,
    masterId,
    serviceId: action.serviceId,
    timezone: context.master.timezone,
    startTime: action.startTime,
    bookingStart: resolvedStartTime,
    availableSlots,
  });

  if (
    !resolvedStartTime ||
    !resolvedTimeMatchesRequest(
      requestedTime,
      resolvedStartTime,
      context.master.timezone,
    )
  ) {
    console.error("[BOOK] time resolution failed", {
      requestedTime,
      resolvedStartTime,
      dateKey,
    });
    return { message: TIME_RESOLUTION_ERROR };
  }

  const phone = await resolveClientPhone(masterId, clientTelegramId);
  if (!phone) {
    return {
      message:
        "Для запису мені потрібен ваш номер телефону. Надішліть його у форматі +380XXXXXXXXX.",
    };
  }

  const name = clientName?.trim() || `Клієнт ${clientTelegramId}`;
  const when = formatDateTime(resolvedStartTime, context.master.timezone);

  return {
    message: `Підсумок запису:\n\nПослуга: ${service.name}\nЧас: ${when}\n\nНатисніть «✅ Підтвердити запис», щоб створити запис. Запис з'явиться лише після підтвердження.`,
    pendingBooking: {
      masterId,
      serviceId: action.serviceId,
      startTime: resolvedStartTime,
      dateKey,
      requestedTime,
      clientName: name,
      clientPhone: phone,
    },
  };
}

export async function confirmPendingBooking(params: {
  pendingBooking: PendingBooking;
  clientTelegramId: number;
}): Promise<ExecuteActionResult> {
  const { pendingBooking, clientTelegramId } = params;
  const {
    masterId,
    serviceId,
    startTime,
    dateKey,
    requestedTime,
    clientName,
    clientPhone,
  } = pendingBooking;

  const context = await getMasterContext(masterId, clientTelegramId.toString());
  if (!context) {
    return { message: "Майстра не знайдено." };
  }

  const subscriptionActive = await isMasterSubscriptionActive(masterId);
  if (!subscriptionActive) {
    return {
      message:
        "Запис тимчасово недоступний. Зверніться безпосередньо до майстра.",
    };
  }

  const service = context.services.find((s) => s.id === serviceId);
  if (!service) {
    return { message: "Послугу не знайдено." };
  }

  if (!dateKey || !requestedTime) {
    return { message: TIME_RESOLUTION_ERROR };
  }

  if (!isWorkingDay(dateKey, context.workingHours, context.master.timezone)) {
    return { message: getDayOffMessage(dateKey, context) };
  }

  const availableSlots = await getAvailableSlots(masterId, dateKey, serviceId);
  const resolvedStartTime = resolveBookingStartTime(
    dateKey,
    context.master.timezone,
    availableSlots,
    requestedTime,
    startTime,
  );

  logAiAction("CONFIRM_BOOKING", {
    requestedDate: dateKey,
    requestedTime,
    masterId,
    serviceId,
    timezone: context.master.timezone,
    pendingBookingStartTime: startTime,
    bookingStart: resolvedStartTime,
    availableSlots,
  });

  if (
    !resolvedStartTime ||
    !resolvedTimeMatchesRequest(
      requestedTime,
      resolvedStartTime,
      context.master.timezone,
    )
  ) {
    console.error("[CONFIRM_BOOKING] time resolution failed", {
      requestedTime,
      resolvedStartTime,
      pendingStartTime: startTime,
      dateKey,
    });
    return { message: TIME_RESOLUTION_ERROR };
  }

  const bookingStart = new Date(resolvedStartTime);
  if (Number.isNaN(bookingStart.getTime())) {
    return { message: TIME_RESOLUTION_ERROR };
  }

  const { data: duplicateBooking } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("master_id", masterId)
    .eq("client_telegram_id", clientTelegramId)
    .eq("booking_start", bookingStart.toISOString())
    .in("status", ["pending", "confirmed"])
    .maybeSingle();

    if (duplicateBooking) {
      const when = formatDateTime(
        bookingStart.toISOString(),
        context.master.timezone,
      );
    
      return {
        message: `У вас уже є запис на ${when}. Новий запис не створено.`,
      };
    }

  const hasOverlap = await findOverlappingBooking(
    masterId,
    bookingStart,
    service.duration_minutes,
  );
  if (hasOverlap) {
    return {
      message:
        "Цей час уже зайнятий іншим клієнтом. Напишіть, якщо хочете побачити актуальні вільні слоти.",
    };
  }

  const phone = clientPhone?.trim();
  if (!phone) {
    return {
      message:
        "Для запису потрібен номер телефону. Почніть запис заново і надішліть +380XXXXXXXXX.",
    };
  }

  const name = clientName?.trim() || `Клієнт ${clientTelegramId}`;

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
      service_id: serviceId,
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

  logAiAction("CONFIRM_BOOKING", {
    requestedDate: dateKey,
    requestedTime,
    masterId,
    serviceId,
    timezone: context.master.timezone,
    pendingBookingStartTime: startTime,
    bookingStart: bookingStart.toISOString(),
    availableSlots,
    inserted: true,
  });

  const when = formatDateTime(
    bookingStart.toISOString(),
    masterInfo.timezone,
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

  const { dateKey, requestedTime } = resolveBookDateAndTime(
    {
      date: action.date,
      requestedTime: action.requestedTime,
      startTime: action.newStartTime,
    },
    context.master.timezone,
  );

  if (!dateKey || !requestedTime) {
    return { message: "Потрібні дата та новий час для перенесення." };
  }

  if (!isWorkingDay(dateKey, context.workingHours, context.master.timezone)) {
    return { message: getDayOffMessage(dateKey, context) };
  }

  const serviceId = existing.service_id as string;
  const availableSlots = await getAvailableSlots(masterId, dateKey, serviceId);
  const resolvedStartTime = resolveBookingStartTime(
    dateKey,
    context.master.timezone,
    availableSlots,
    requestedTime,
    action.newStartTime,
  );

  if (
    !resolvedStartTime ||
    !resolvedTimeMatchesRequest(
      requestedTime,
      resolvedStartTime,
      context.master.timezone,
    )
  ) {
    const dateFormatted = formatDateLongWithWeekday(
      dateKey,
      context.master.timezone,
    );
    return {
      message: `Цей час вже зайнятий або недоступний на ${dateFormatted}. Напишіть, якщо хочете побачити актуальні вільні слоти.`,
    };
  }

  const resolvedBookingStart = new Date(resolvedStartTime);

  const durationMinutes = existing.duration_minutes as number;
  const hasOverlap = await findOverlappingBooking(
    masterId,
    resolvedBookingStart,
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

  const { data: newBooking, error: createError } = await supabaseAdmin
    .from("bookings")
    .insert({
      master_id: masterId,
      customer_id: existing.customer_id,
      client_telegram_id: clientTelegramId,
      client_name: existing.client_name,
      client_phone: existing.client_phone,
      service_id: serviceId,
      booking_start: resolvedStartTime,
      duration_minutes: durationMinutes,
      status: "pending",
      notes: "перенесено через AI-адміністратора",
    })
    .select("*, services(id, name, price)")
    .single();

  if (createError) throw createError;

  const when = formatDateTime(resolvedStartTime, context.master.timezone);

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
      const when = formatDateTime(
        booking.booking_start,
        context.master.timezone,
      );
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
