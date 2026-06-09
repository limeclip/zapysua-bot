import type { MasterWithMeta } from "@/types";

type SubscriptionLike = {
  status: string;
  trial_end_date?: string | null;
  subscription_end_date?: string | null;
} | null;

export function isSubscriptionActive(subscription: SubscriptionLike): boolean {
  if (!subscription) return false;

  const now = new Date();

  if (subscription.status === "trial") {
    if (!subscription.trial_end_date) return true;
    return new Date(subscription.trial_end_date) > now;
  }

  if (subscription.status === "active") {
    if (!subscription.subscription_end_date) return true;
    return new Date(subscription.subscription_end_date) > now;
  }

  return false;
}

export function hasPaidSubscriptionActive(
  subscription: MasterWithMeta["subscription"],
): boolean {
  if (!subscription || subscription.status !== "active") return false;
  if (!subscription.subscription_end_date) return true;
  return new Date(subscription.subscription_end_date) > new Date();
}

export function getSubscriptionStatusLabel(
  subscription: MasterWithMeta["subscription"],
): string {
  if (!subscription) return "Немає підписки";

  if (isSubscriptionActive(subscription)) {
    if (subscription.status === "trial") return "Пробний період";
    return "Активна підписка";
  }

  if (subscription.status === "cancelled") return "Скасована";
  return "Підписка закінчилась";
}
