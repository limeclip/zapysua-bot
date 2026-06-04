import { supabaseAdmin } from "@/lib/supabase/server";
import { generateDefaultSlug } from "@/lib/slug";
import type { AiSettings, Master, MasterWithMeta, Service } from "@/types";

const DEFAULT_MASTER_NAME = "Новий майстер";

export async function getMasterByTelegramId(
  telegramId: number,
): Promise<Master | null> {
  const { data, error } = await supabaseAdmin
    .from("masters")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw error;
  return data as Master | null;
}

export async function getMasterById(id: string): Promise<Master | null> {
  const { data, error } = await supabaseAdmin
    .from("masters")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data as Master | null;
}

export async function getMasterBySlug(slug: string): Promise<Master | null> {
  const { data, error } = await supabaseAdmin
    .from("masters")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data as Master | null;
}

export async function findMasterByStartParam(
  param: string,
): Promise<Master | null> {
  const trimmed = param.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("ref_")) {
    return getMasterById(trimmed.slice(4));
  }

  if (/^\d+$/.test(trimmed)) {
    return getMasterByTelegramId(parseInt(trimmed, 10));
  }

  return getMasterBySlug(trimmed);
}

export async function isSlugTaken(
  slug: string,
  excludeMasterId?: string,
): Promise<boolean> {
  let query = supabaseAdmin
    .from("masters")
    .select("id")
    .eq("slug", slug);

  if (excludeMasterId) {
    query = query.neq("id", excludeMasterId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getActiveServicesForMaster(
  masterId: string,
): Promise<Service[]> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("master_id", masterId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function getMasterWithMeta(
  telegramId: number,
): Promise<MasterWithMeta | null> {
  const master = await getMasterByTelegramId(telegramId);
  if (!master) return null;

  const { data: aiSettings } = await supabaseAdmin
    .from("ai_settings")
    .select("*")
    .eq("master_id", master.id)
    .maybeSingle();

  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("status, plan_type, trial_end_date")
    .eq("master_id", master.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...master,
    ai_settings: (aiSettings as AiSettings | null) ?? null,
    subscription: subscription ?? null,
    is_onboarded: isOnboarded(master, aiSettings as AiSettings | null),
  };
}

export function isOnboarded(
  master: Master,
  aiSettings: AiSettings | null,
): boolean {
  if (!aiSettings) return false;
  if (master.business_name === DEFAULT_MASTER_NAME) return false;
  return true;
}

export async function ensureMinimalMaster(
  telegramId: number,
  username?: string,
): Promise<Master> {
  const existing = await getMasterByTelegramId(telegramId);
  if (existing) return existing;

  const businessName = username
    ? `@${username.replace(/^@/, "")}`
    : DEFAULT_MASTER_NAME;

  const { data, error } = await supabaseAdmin
    .from("masters")
    .insert({
      telegram_id: telegramId,
      username: username ?? null,
      business_name: businessName,
      category: "other",
      slug: generateDefaultSlug(telegramId),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Master;
}

export async function completeOnboarding(params: {
  telegram_id: number;
  username?: string;
  business_name: string;
  category: string;
  location?: string | null;
  tone: string;
  logo_url?: string | null;
}): Promise<Master> {
  let master = await getMasterByTelegramId(params.telegram_id);

  if (!master) {
    const { data, error } = await supabaseAdmin
      .from("masters")
      .insert({
        telegram_id: params.telegram_id,
        username: params.username ?? null,
        business_name: params.business_name,
        category: params.category,
        location: params.location ?? null,
        logo_url: params.logo_url ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    master = data as Master;
  } else {
    const { data, error } = await supabaseAdmin
      .from("masters")
      .update({
        business_name: params.business_name,
        category: params.category,
        location: params.location ?? null,
        logo_url: params.logo_url ?? master.logo_url,
        username: params.username ?? master.username,
      })
      .eq("id", master.id)
      .select("*")
      .single();

    if (error) throw error;
    master = data as Master;
  }

  const { data: existingAi } = await supabaseAdmin
    .from("ai_settings")
    .select("master_id")
    .eq("master_id", master.id)
    .maybeSingle();

  if (!existingAi) {
    const { error: aiError } = await supabaseAdmin.from("ai_settings").insert({
      master_id: master.id,
      tone: params.tone,
    });
    if (aiError) throw aiError;
  } else {
    const { error: aiError } = await supabaseAdmin
      .from("ai_settings")
      .update({ tone: params.tone })
      .eq("master_id", master.id);
    if (aiError) throw aiError;
  }

  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("master_id", master.id)
    .limit(1)
    .maybeSingle();

  if (!existingSub) {
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
      master_id: master.id,
      status: "trial",
      plan_type: "basic",
      trial_start_date: trialStart.toISOString(),
      trial_end_date: trialEnd.toISOString(),
    });
    if (subError) throw subError;
  }

  return master;
}
