import { NextResponse } from "next/server";
import { bot } from "@/lib/bot";
import {
  badRequest,
  requireMaster,
  serverError,
} from "@/lib/api/response";
import {
  buildInvoicePayload,
  isStarPlanId,
  STAR_PLAN_PRICES,
  type StarPlanId,
} from "@/lib/stars-plans";
import { getSubscriptionForMaster } from "@/lib/subscription-server";
import { hasPaidSubscriptionActive } from "@/lib/subscription";

export async function POST(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const planRaw = String(body.plan ?? "");

    if (!isStarPlanId(planRaw)) {
      return badRequest("Оберіть тариф: monthly або yearly");
    }

    const plan: StarPlanId = planRaw;
    const subscription = await getSubscriptionForMaster(authResult.master.id);

    if (hasPaidSubscriptionActive(subscription)) {
      return badRequest("Підписка вже активна");
    }

    const planConfig = STAR_PLAN_PRICES[plan];

    const invoiceLink = await bot.api.createInvoiceLink(
      planConfig.title,
      planConfig.description,
      buildInvoicePayload(authResult.master.id, plan),
      "",
      "XTR",
      [{ label: "Підписка", amount: planConfig.amount }],
    );

    return NextResponse.json({ invoiceLink });
  } catch (error) {
    console.error("[api/stars/create-invoice]", error);
    return serverError("Не вдалося створити рахунок для оплати");
  }
}
