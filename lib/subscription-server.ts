import { supabaseAdmin } from "@/lib/supabase/server";
import type { StarPlanId } from "@/lib/stars-plans";
import { STAR_PLAN_PRICES } from "@/lib/stars-plans";

export type SubscriptionRecord = {
  id: string;
  master_id: string;
  status: string;
  plan_type: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  stars_amount: number | null;
  telegram_payment_charge_id: string | null;
  telegram_invoice_payload: string | null;
  last_payment_amount: number | null;
  last_payment_date: string | null;
};

export async function getSubscriptionForMaster(
  masterId: string,
): Promise<SubscriptionRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("master_id", masterId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return syncSubscriptionExpiry(data as SubscriptionRecord);
}

export async function syncSubscriptionExpiry(
  subscription: SubscriptionRecord,
): Promise<SubscriptionRecord> {
  const now = new Date();
  let nextStatus = subscription.status;

  if (
    subscription.status === "trial" &&
    subscription.trial_end_date &&
    new Date(subscription.trial_end_date) <= now
  ) {
    nextStatus = "expired";
  }

  if (
    subscription.status === "active" &&
    subscription.subscription_end_date &&
    new Date(subscription.subscription_end_date) <= now
  ) {
    nextStatus = "expired";
  }

  if (nextStatus !== subscription.status) {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: nextStatus })
      .eq("id", subscription.id)
      .select("*")
      .single();

    if (error) throw error;
    return data as SubscriptionRecord;
  }

  return subscription;
}

export async function activateSubscriptionFromPayment(params: {
  masterId: string;
  plan: StarPlanId;
  chargeId: string;
  invoicePayload: string;
  amount: number;
}): Promise<SubscriptionRecord> {
  const planConfig = STAR_PLAN_PRICES[params.plan];
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + planConfig.days);

  const existing = await getSubscriptionForMaster(params.masterId);

  const updateData = {
    status: "active" as const,
    plan_type: params.plan,
    subscription_start_date: now.toISOString(),
    subscription_end_date: end.toISOString(),
    stars_amount: params.amount,
    telegram_payment_charge_id: params.chargeId,
    telegram_invoice_payload: params.invoicePayload,
    last_payment_amount: params.amount,
    last_payment_date: now.toISOString(),
  };

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update(updateData)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data as SubscriptionRecord;
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      master_id: params.masterId,
      ...updateData,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SubscriptionRecord;
}

export async function isMasterSubscriptionActive(
  masterId: string,
): Promise<boolean> {
  const { isSubscriptionActive } = await import("@/lib/subscription");
  const subscription = await getSubscriptionForMaster(masterId);
  return isSubscriptionActive(subscription);
}
