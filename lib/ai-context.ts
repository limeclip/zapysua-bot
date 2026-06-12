import { supabaseAdmin } from "@/lib/supabase/server";
import {
  addDaysToDateKey,
  formatDateKey,
  formatDateLongWithWeekday,
  formatTime,
  parseDateFromUserText,
  zonedDateTimeToUtc,
} from "@/lib/dates";
import {
  parseWorkingHours,
  formatWorkingDaysList,
  getWeekdayKeyInTimezone,
  isWorkingDay,
  WEEKDAYS,
} from "@/lib/working-hours";
import { getCategoryLabel } from "@/lib/master-category";
import type {
  AiSettings,
  AiTone,
  Booking,
  Master,
  Service,
  WorkingHours,
} from "@/types";

export type MasterContext = {
  master: Pick<
    Master,
    "id" | "business_name" | "category" | "working_hours" | "timezone"
  >;
  services: Pick<
    Service,
    "id" | "name" | "price" | "duration_minutes"
  >[];
  aiSettings: Pick<AiSettings, "tone" | "system_prompt">;
  clientBookings: Pick<
    Booking,
    "id" | "service_id" | "booking_start" | "duration_minutes" | "status"
  >[];
  workingHours: WorkingHours;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  data: MasterContext;
  expiresAt: number;
};

const contextCache = new Map<string, CacheEntry>();

const TONE_LABELS: Record<AiTone, string> = {
  friendly: "дружній",
  professional: "професійний",
  caring: "турботливий",
  formal: "офіційний",
};

export function getToneLabel(tone: AiTone): string {
  return TONE_LABELS[tone] ?? tone;
}

export function formatDateContextLine(
  dateKey: string,
  workingHours: WorkingHours,
  timeZone: string,
): string {
  const formatted = formatDateLongWithWeekday(dateKey, timeZone);
  if (!isWorkingDay(dateKey, workingHours, timeZone)) {
    return `${formatted} — вихідний день`;
  }
  const weekdayKey = getWeekdayKeyInTimezone(
    zonedDateTimeToUtc(dateKey, "12:00", timeZone),
    timeZone,
  );
  const day = workingHours[weekdayKey];
  return `${formatted} — робочий день, ${day.start}–${day.end}`;
}

export function formatWorkingHoursString(
  workingHours: WorkingHours,
  timeZone: string,
): string {
  const lines = WEEKDAYS.filter(({ key }) => workingHours[key].enabled).map(
    ({ key, label }) => {
      const day = workingHours[key];
      return `${label}: ${day.start}–${day.end}`;
    },
  );

  if (lines.length === 0) {
    return "графік не налаштовано";
  }

  return `${lines.join("; ")} (часовий пояс: ${timeZone})`;
}

export function formatServicesForPrompt(
  services: MasterContext["services"],
): string {
  if (services.length === 0) {
    return "послуги ще не додані";
  }

  return services
    .map(
      (service) =>
        `- ${service.name} (id: ${service.id}) — ${service.price} грн, ${service.duration_minutes} хв`,
    )
    .join("\n");
}

export function formatClientBookingsForPrompt(
  bookings: MasterContext["clientBookings"],
  timeZone: string,
): string {
  if (bookings.length === 0) {
    return "немає майбутніх записів";
  }

  return bookings
    .map((booking) => {
      const dateKey = formatDateKey(new Date(booking.booking_start), timeZone);
      const whenDate = formatDateLongWithWeekday(dateKey, timeZone);
      const whenTime = formatTime(booking.booking_start, timeZone);
      return `- id: ${booking.id}, ${whenDate} о ${whenTime}, статус: ${booking.status}`;
    })
    .join("\n");
}

async function fetchMasterContext(
  masterId: string,
  clientTelegramId?: string,
): Promise<MasterContext | null> {
  const { data: master, error: masterError } = await supabaseAdmin
    .from("masters")
    .select("id, business_name, category, working_hours, timezone")
    .eq("id", masterId)
    .eq("is_active", true)
    .maybeSingle();

  if (masterError) throw masterError;
  if (!master) return null;

  const { data: services, error: servicesError } = await supabaseAdmin
    .from("services")
    .select("id, name, price, duration_minutes")
    .eq("master_id", masterId)
    .eq("is_active", true)
    .order("name");

  if (servicesError) throw servicesError;

  const { data: aiSettings, error: aiError } = await supabaseAdmin
    .from("ai_settings")
    .select("tone, system_prompt")
    .eq("master_id", masterId)
    .maybeSingle();

  if (aiError) throw aiError;

  let clientBookings: MasterContext["clientBookings"] = [];

  if (clientTelegramId) {
    const now = new Date().toISOString();
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("id, service_id, booking_start, duration_minutes, status")
      .eq("master_id", masterId)
      .eq("client_telegram_id", Number(clientTelegramId))
      .in("status", ["pending", "confirmed"])
      .gte("booking_start", now)
      .order("booking_start", { ascending: true });

    if (bookingsError) throw bookingsError;
    clientBookings = bookings ?? [];
  }

  const workingHours = parseWorkingHours(
    master.working_hours as Record<string, unknown> | null,
  );

  return {
    master: {
      id: master.id,
      business_name: master.business_name,
      category: master.category,
      working_hours: master.working_hours,
      timezone: master.timezone ?? "Europe/Kyiv",
    },
    services: services ?? [],
    aiSettings: {
      tone: (aiSettings?.tone as MasterContext["aiSettings"]["tone"]) ?? "friendly",
      system_prompt: aiSettings?.system_prompt ?? null,
    },
    clientBookings,
    workingHours,
  };
}

export async function getMasterContext(
  masterId: string,
  clientTelegramId?: string,
): Promise<MasterContext | null> {
  const cacheKey = `${masterId}:${clientTelegramId ?? "anon"}`;
  const cached = contextCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const context = await fetchMasterContext(masterId, clientTelegramId);
  if (!context) return null;

  contextCache.set(cacheKey, {
    data: context,
    expiresAt: now + CACHE_TTL_MS,
  });

  return context;
}

export function invalidateMasterContextCache(masterId: string): void {
  for (const key of contextCache.keys()) {
    if (key.startsWith(`${masterId}:`)) {
      contextCache.delete(key);
    }
  }
}

export function buildCalendarReference(
  context: MasterContext,
  days = 45,
): string {
  const timeZone = context.master.timezone;
  let dateKey = formatDateKey(new Date(), timeZone);
  const lines: string[] = [];

  for (let i = 0; i < days; i++) {
    lines.push(formatDateContextLine(dateKey, context.workingHours, timeZone));
    dateKey = addDaysToDateKey(dateKey, 1);
  }

  return lines.join("\n");
}

export function buildUserDateHints(
  userMessage: string,
  context: MasterContext,
): string {
  const timeZone = context.master.timezone;
  const dateKeys = parseDateFromUserText(userMessage, timeZone);
  if (dateKeys.length === 0) return "";

  return dateKeys
    .map((dateKey) =>
      formatDateContextLine(dateKey, context.workingHours, timeZone),
    )
    .join("\n");
}

export function buildDefaultSystemPrompt(
  context: MasterContext,
  toneOverride?: string,
): string {
  const { master, services, aiSettings, clientBookings, workingHours } =
    context;
  const tone = toneOverride ?? getToneLabel(aiSettings.tone);
  const category = getCategoryLabel(master.category);
  const timeZone = master.timezone;
  const workingHoursString = formatWorkingHoursString(
    workingHours,
    timeZone,
  );
  const workingDaysList = formatWorkingDaysList(workingHours);
  const servicesList = formatServicesForPrompt(services);
  const bookingsList = formatClientBookingsForPrompt(
    clientBookings,
    timeZone,
  );
  const todayKey = formatDateKey(new Date(), timeZone);
  const todayContext = formatDateContextLine(todayKey, workingHours, timeZone);
  const calendarReference = buildCalendarReference(context, 365);

  return `Ти — AI-адміністратор студії "${master.business_name}". Категорія: ${category}.
Ти допомагаєш клієнтам записатися на послуги, змінювати/скасовувати записи,
відповідаєш на запитання про ціни, графік роботи, вільний час.

Сьогодні (з backend): ${todayContext}

КАЛЕНДАР BACKEND (єдине джерело правди про день тижня та вихідні):
${calendarReference}

ЗАБОРОНЕНО самостійно визначати день тижня, робочий/вихідний день, вигадувати слоти або змінювати час клієнта.
Якщо клієнт назвав дату, спочатку знайди її у CALENDAR BACKEND.

Відповідь про день тижня і робочий/вихідний день дозволена ТІЛЬКИ на основі рядка CALENDAR BACKEND.

Заборонено використовувати власні знання про календар.

Ось список послуг (назва - ціна (грн) - тривалість хв):
${servicesList}

Робочі дні та години: ${workingDaysList}.
Повний графік: ${workingHoursString}.
ЗАБОРОНЕНО визначати вихідний день самостійно.

Вихідним вважається ТІЛЬКИ день, який у CALENDAR BACKEND позначений як "вихідний день".

Якщо дата позначена як "робочий день" — ти не маєш права називати її вихідним днем.

Якщо не знаєш статус дати — використовуй show_slots для перевірки.

Майбутні записи клієнта:
${bookingsList}

Твій тон: ${tone}.
Відповідай коротко, ввічливо, українською мовою.
Якщо клієнт хоче записатися — запитай послугу, дату, час.
Якщо клієнт питає вільні слоти — використовуй ТІЛЬКИ дію show_slots. Ніколи не перелічуй слоти у тексті.
Слоти генерує backend з кроком = тривалість послуги.
Якщо клієнт просить перенести/скасувати запис — уточни, який саме (за датою або ID).
Після збору даних для запису надішли ОДНУ дію JSON (в кінці відповіді):
{"action":"book","serviceId":"uuid","date":"2026-06-19","requestedTime":"11:00"}

Для скасування: {"action":"cancel","bookingId":"uuid"}
Для перенесення: {"action":"reschedule","bookingId":"uuid","date":"2026-06-19","requestedTime":"11:00"}
Для показу списку послуг: {"action":"show_services"}
Для показу вільних слотів на конкретну дату: {"action":"show_slots","serviceId":"uuid","date":"2025-06-12"}
Запис створюється лише після підтвердження кнопкою клієнтом.
Якщо не впевнений — відповідай текстом без дії.`;
}
