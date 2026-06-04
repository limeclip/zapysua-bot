import type { MasterWithMeta } from "@/types";

export function isSubscriptionActive(
  subscription: MasterWithMeta["subscription"],
): boolean {
  if (!subscription) return false;
  return subscription.status === "trial" || subscription.status === "active";
}
