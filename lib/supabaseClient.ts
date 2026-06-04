import { createClient } from "@supabase/supabase-js";
import type {
  CreateMasterInput,
  CreateServiceInput,
  Master,
  MasterCategory,
  Service,
  UpdateMasterInput,
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

export const CATEGORY_LABELS: Record<MasterCategory, string> = {
  beauty: "💇 Краса",
  health: "🏥 Здоров'я",
  education: "📚 Освіта",
  auto: "🚗 Авто",
  other: "📦 Інше",
};
