import { createClient } from "@supabase/supabase-js";
import {
  minutesToTime,
  parseTimeToMinutes,
  toIsoRangeEnd,
  toIsoRangeStart,
  zonedDateTimeToUtc,
} from "@/lib/dates";
import {
  getWeekdayKeyInTimezone,
  parseWorkingHours,
} from "@/lib/working-hours";
import { normalizeUaPhone } from "@/lib/phone";
import type {
  BookingSlot,
  CreateMasterInput,
  CreateServiceInput,
  Customer,
  Master,
  MasterCategory,
  Service,
  UpdateMasterInput,
  WorkingHours,
} from "@/types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL та SUPABASE_SERVICE_ROLE_KEY (або SUPABASE_ANON_KEY) обов'язкові",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_MASTER_NAME = "Новий майстер";

export async function setTelegramContext(tgId: number): Promise<void> {
  const { error } = await supabase.rpc("set_telegram_context", {
    tg_id: tgId,
  });

  if (error) {
    console.error("[supabase] setTelegramContext:", error);
    throw error;
  }
}

export async function getMasterByTelegramId(
  tgId: number,
): Promise<Master | null> {
  await setTelegramContext(tgId);

  const { data, error } = await supabase
    .from("masters")
    .select("*")
    .eq("telegram_id", tgId)
    .maybeSingle();

  if (error) {
    console.error("[supabase] getMasterByTelegramId:", error);
    throw error;
  }

  return data as Master | null;
}

export async function createMaster(data: CreateMasterInput): Promise<Master> {
  await setTelegramContext(data.telegram_id);

  const { data: master, error: masterError } = await supabase
    .from("masters")
    .insert({
      telegram_id: data.telegram_id,
      username: data.username ?? null,
      business_name: data.business_name,
      category: data.category ?? "other",
      location: data.location ?? null,
    })
    .select("*")
    .single();

  if (masterError) {
    console.error("[supabase] createMaster:", masterError);
    throw masterError;
  }

  await ensureMasterDefaults(master.id, data.telegram_id);

  return master as Master;
}

export async function getOrCreateMinimalMaster(
  tgId: number,
  username?: string,
): Promise<{ master: Master; isNew: boolean }> {
  const existing = await getMasterByTelegramId(tgId);
  if (existing) {
    return { master: existing, isNew: false };
  }

  const businessName = username ? `@${username.replace(/^@/, "")}` : DEFAULT_MASTER_NAME;

  const master = await createMinimalMaster({
    telegram_id: tgId,
    username: username ?? null,
    business_name: businessName,
  });

  return { master, isNew: true };
}

async function createMinimalMaster(data: CreateMasterInput): Promise<Master> {
  await setTelegramContext(data.telegram_id);

  const { data: master, error } = await supabase
    .from("masters")
    .insert({
      telegram_id: data.telegram_id,
      username: data.username ?? null,
      business_name: data.business_name,
      category: "other",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[supabase] createMinimalMaster:", error);
    throw error;
  }

  return master as Master;
}

export async function updateMaster(
  masterId: string,
  tgId: number,
  data: UpdateMasterInput,
): Promise<Master> {
  await setTelegramContext(tgId);

  const { data: master, error } = await supabase
    .from("masters")
    .update(data)
    .eq("id", masterId)
    .select("*")
    .single();

  if (error) {
    console.error("[supabase] updateMaster:", error);
    throw error;
  }

  return master as Master;
}

export async function hasAiSettings(masterId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("ai_settings")
    .select("master_id")
    .eq("master_id", masterId)
    .maybeSingle();

  if (error) {
    console.error("[supabase] hasAiSettings:", error);
    throw error;
  }

  return Boolean(data);
}

export async function ensureMasterDefaults(
  masterId: string,
  tgId: number,
): Promise<void> {
  await setTelegramContext(tgId);

  const aiExists = await hasAiSettings(masterId);

  if (!aiExists) {
    const { error: aiError } = await supabase.from("ai_settings").insert({
      master_id: masterId,
    });

    if (aiError) {
      console.error("[supabase] ensureMasterDefaults ai_settings:", aiError);
      throw aiError;
    }
  }

  const { data: subscription, error: subCheckError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("master_id", masterId)
    .limit(1)
    .maybeSingle();

  if (subCheckError) {
    console.error("[supabase] ensureMasterDefaults subscriptions check:", subCheckError);
    throw subCheckError;
  }

  if (!subscription) {
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const { error: subError } = await supabase.from("subscriptions").insert({
      master_id: masterId,
      status: "trial",
      plan_type: "basic",
      trial_start_date: trialStart.toISOString(),
      trial_end_date: trialEnd.toISOString(),
    });

    if (subError) {
      console.error("[supabase] ensureMasterDefaults subscriptions:", subError);
      throw subError;
    }
  }
}

export function needsOnboarding(master: Master): boolean {
  return master.business_name === DEFAULT_MASTER_NAME;
}

export async function isMasterOnboarded(master: Master): Promise<boolean> {
  return hasAiSettings(master.id);
}

export function getOnboardingStep(master: Master): "name" | "category" {
  if (master.business_name === DEFAULT_MASTER_NAME) {
    return "name";
  }
  return "category";
}

export async function getServices(masterId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("master_id", masterId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[supabase] getServices:", error);
    throw error;
  }

  return (data ?? []) as Service[];
}

export async function createService(
  masterId: string,
  tgId: number,
  serviceData: CreateServiceInput,
): Promise<Service> {
  await setTelegramContext(tgId);

  const { data, error } = await supabase
    .from("services")
    .insert({
      master_id: masterId,
      name: serviceData.name,
      price: serviceData.price,
      duration_minutes: serviceData.duration_minutes,
      description: serviceData.description ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[supabase] createService:", error);
    throw error;
  }

  return data as Service;
}

export async function deleteService(
  serviceId: string,
  masterId: string,
  tgId: number,
): Promise<void> {
  await setTelegramContext(tgId);

  const { error } = await supabase
    .from("services")
    .update({ is_active: false })
    .eq("id", serviceId)
    .eq("master_id", masterId);

  if (error) {
    console.error("[supabase] deleteService:", error);
    throw error;
  }
}

export async function getOrCreateCustomerByPhone(
  masterId: string,
  name: string,
  phone: string,
  telegramId?: number | null,
): Promise<Customer> {
  const normalizedPhone = normalizeUaPhone(phone);
  if (!normalizedPhone) {
    throw new Error("Невірний номер телефону");
  }

  const { data: byPhone, error: phoneError } = await supabase
    .from("customers")
    .select("*")
    .eq("master_id", masterId)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (phoneError) throw phoneError;

  if (byPhone) {
    const updates: { name?: string; telegram_id?: number } = {};
    if (name && byPhone.name !== name) updates.name = name;
    if (telegramId && !byPhone.telegram_id) updates.telegram_id = telegramId;

    if (Object.keys(updates).length > 0) {
      const { data: updated, error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", byPhone.id)
        .select("*")
        .single();
      if (error) throw error;
      return updated as Customer;
    }

    return byPhone as Customer;
  }

  if (telegramId) {
    const { data: byTelegram, error: tgError } = await supabase
      .from("customers")
      .select("*")
      .eq("master_id", masterId)
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (tgError) throw tgError;

    if (byTelegram) {
      const { data: updated, error } = await supabase
        .from("customers")
        .update({ name, phone: normalizedPhone })
        .eq("id", byTelegram.id)
        .select("*")
        .single();
      if (error) throw error;
      return updated as Customer;
    }
  }

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      master_id: masterId,
      telegram_id: telegramId ?? null,
      name,
      phone: normalizedPhone,
    })
    .select("*")
    .single();

  if (error) throw error;
  return created as Customer;
}

export async function getOrCreateCustomer(
  masterId: string,
  tgId: number | null | undefined,
  name: string,
  phone: string | null,
): Promise<string> {
  if (!phone) {
    throw new Error("Телефон обов'язковий");
  }

  const customer = await getOrCreateCustomerByPhone(
    masterId,
    name,
    phone,
    tgId,
  );
  return customer.id;
}

function slotOverlapsBooking(
  slotStart: Date,
  slotEnd: Date,
  bookingStart: string,
  durationMinutes: number,
): boolean {
  const existingStart = new Date(bookingStart);
  const existingEnd = new Date(
    existingStart.getTime() + durationMinutes * 60 * 1000,
  );
  return slotStart < existingEnd && slotEnd > existingStart;
}

export type GetAvailableSlotsOptions = {
  workingHours?: WorkingHours;
  timeZone?: string;
  serviceId?: string;
  duration?: number;
  slotStepMinutes?: number;
};

export async function getAvailableSlots(
  masterId: string,
  date: string,
  serviceDuration?: number,
  options?: GetAvailableSlotsOptions,
): Promise<BookingSlot[]> {
  let duration = serviceDuration ?? options?.duration;

  if ((!duration || duration < 1) && options?.serviceId) {
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", options.serviceId)
      .eq("master_id", masterId)
      .eq("is_active", true)
      .maybeSingle();

    if (serviceError) throw serviceError;
    duration = service?.duration_minutes;
  }

  if (!duration || duration < 1) return [];

  let workingHours = options?.workingHours;
  let timeZone = options?.timeZone ?? "Europe/Kyiv";

  if (!workingHours) {
    const { data: master, error: masterError } = await supabase
      .from("masters")
      .select("working_hours, timezone")
      .eq("id", masterId)
      .maybeSingle();

    if (masterError) throw masterError;
    if (!master) return [];

    workingHours = parseWorkingHours(
      master.working_hours as Record<string, unknown> | null,
    );
    timeZone = master.timezone ?? timeZone;
  }

  const weekday = getWeekdayKeyInTimezone(
    zonedDateTimeToUtc(date, "12:00", timeZone),
    timeZone,
  );
  const dayConfig = workingHours[weekday];
  if (!dayConfig.enabled) return [];

  const dayStartMinutes = parseTimeToMinutes(dayConfig.start);
  const dayEndMinutes = parseTimeToMinutes(dayConfig.end);
  if (dayEndMinutes - dayStartMinutes < duration) return [];

  const dateObj = zonedDateTimeToUtc(date, "00:00", timeZone);
  const rangeStart = toIsoRangeStart(dateObj, timeZone);
  const rangeEnd = toIsoRangeEnd(dateObj, timeZone);

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("booking_start, duration_minutes")
    .eq("master_id", masterId)
    .in("status", ["pending", "confirmed", "completed"])
    .gte("booking_start", rangeStart)
    .lte("booking_start", rangeEnd);

  if (bookingsError) throw bookingsError;

  const now = new Date();
  const slots: BookingSlot[] = [];
  const step = options?.slotStepMinutes ?? duration;

  for (
    let minutes = dayStartMinutes;
    minutes + duration <= dayEndMinutes;
    minutes += step
  ) {
    const time = minutesToTime(minutes);
    const slotStart = zonedDateTimeToUtc(date, time, timeZone);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

    if (slotStart <= now) continue;

    const hasOverlap = (bookings ?? []).some((booking) =>
      slotOverlapsBooking(
        slotStart,
        slotEnd,
        booking.booking_start,
        booking.duration_minutes,
      ),
    );

    if (!hasOverlap) {
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }
  }

  return slots;
}

export const CATEGORY_LABELS: Record<MasterCategory, string> = {
  beauty: "💇 Краса",
  health: "🏥 Здоров'я",
  education: "📚 Освіта",
  auto: "🚗 Авто",
  other: "📦 Інше",
};
