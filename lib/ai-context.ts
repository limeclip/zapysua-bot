import { supabaseAdmin } from "@/lib/supabase/server";
import { parseWorkingHours, WEEKDAYS } from "@/lib/working-hours";
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
      const when = new Intl.DateTimeFormat("uk-UA", {
        timeZone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(booking.booking_start));
      return `- id: ${booking.id}, ${when}, статус: ${booking.status}`;
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

export function buildDefaultSystemPrompt(
  context: MasterContext,
  toneOverride?: string,
): string {
  const { master, services, aiSettings, clientBookings, workingHours } =
    context;
  const tone = toneOverride ?? getToneLabel(aiSettings.tone);
  const category = getCategoryLabel(master.category);
  const workingHoursString = formatWorkingHoursString(
    workingHours,
    master.timezone,
  );
  const servicesList = formatServicesForPrompt(services);
  const bookingsList = formatClientBookingsForPrompt(
    clientBookings,
    master.timezone,
  );

  return `Ти — AI-адміністратор студії "${master.business_name}". Категорія: ${category}.
Ти допомагаєш клієнтам записатися на послуги, змінювати/скасовувати записи,
відповідаєш на запитання про ціни, графік роботи, вільний час.

Ось список послуг (назва - ціна (грн) - тривалість хв):
${servicesList}

Робочі години: ${workingHoursString}.

Майбутні записи клієнта:
${bookingsList}

Твій тон: ${tone}.
Відповідай коротко, ввічливо, українською мовою.
Якщо клієнт хоче записатися — запитай послугу, дату, час (використовуй формат YYYY-MM-DDThh:mm:ssZ).
Якщо клієнт питає вільні слоти — поверни реальні слоти (на основі робочих годин і зайнятих записів). Слоти генеруються з кроком 30 хвилин.
Якщо клієнт просить перенести/скасувати запис — уточни, який саме (за датою або ID).
Після того, як клієнт надав усі необхідні дані для запису (послуга, дата, час), надішли дію у форматі JSON (тільки в кінці відповіді, після тексту):
{"action":"book","serviceId":"uuid","startTime":"2025-06-12T15:00:00Z"}

Для скасування: {"action":"cancel","bookingId":"uuid"}
Для перенесення: {"action":"reschedule","bookingId":"uuid","newStartTime":"2025-06-13T10:00:00Z"}
Для показу списку послуг: {"action":"show_services"}
Для показу вільних слотів на конкретну дату: {"action":"show_slots","serviceId":"uuid","date":"2025-06-12"}
Якщо не впевнений — просто дай відповідь текстом без дії.

Ніколи не вигадуй слоти, ID, дати. Якщо чогось не знаєш — скажи, що тобі потрібно уточнити.`;
}
