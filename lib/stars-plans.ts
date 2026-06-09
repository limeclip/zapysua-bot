export type StarPlanId = "monthly" | "yearly";

export const STAR_PLAN_PRICES: Record<
  StarPlanId,
  {
    amount: number;
    days: number;
    title: string;
    description: string;
    cardLabel: string;
  }
> = {
  monthly: {
    amount: 250,
    days: 30,
    title: "ZapysUa — Підписка на місяць",
    description: "Доступ до AI-адміністратора на 30 днів",
    cardLabel: "Місяць",
  },
  yearly: {
    amount: 2500,
    days: 365,
    title: "ZapysUa — Підписка на рік",
    description: "Доступ до AI-адміністратора на 365 днів",
    cardLabel: "Рік",
  },
};

export function isStarPlanId(value: string): value is StarPlanId {
  return value === "monthly" || value === "yearly";
}

export function buildInvoicePayload(masterId: string, plan: StarPlanId): string {
  return JSON.stringify({ masterId, plan });
}

export function parseInvoicePayload(
  payload: string,
): { masterId: string; plan: StarPlanId } | null {
  try {
    const data = JSON.parse(payload) as { masterId?: string; plan?: string };
    if (!data.masterId || !data.plan || !isStarPlanId(data.plan)) {
      return null;
    }
    return { masterId: data.masterId, plan: data.plan };
  } catch {
    return null;
  }
}
