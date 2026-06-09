import type { Bot } from "grammy";
import { activateSubscriptionFromPayment } from "@/lib/subscription-server";
import { parseInvoicePayload } from "@/lib/stars-plans";
import { getMasterById } from "@/lib/api/masters";
import { formatDateLong, formatDateKey } from "@/lib/dates";
import type { BotContext } from "@/types";

/**
 * Обробники оплати Telegram Stars.
 * Див. docs/payments.md — як тестувати та де дивитись баланс.
 */
export function registerPaymentHandlers(bot: Bot<BotContext>): void {
  bot.on("pre_checkout_query", async (ctx) => {
    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    if (!payment) return;

    const parsed = parseInvoicePayload(payment.invoice_payload);
    if (!parsed) {
      console.error(
        "[bot payments] Невірний payload:",
        payment.invoice_payload,
      );
      await ctx.reply(
        "⚠️ Оплату отримано, але не вдалося активувати підписку. Зверніться до підтримки.",
      );
      return;
    }

    try {
      const subscription = await activateSubscriptionFromPayment({
        masterId: parsed.masterId,
        plan: parsed.plan,
        chargeId: payment.telegram_payment_charge_id,
        invoicePayload: payment.invoice_payload,
        amount: payment.total_amount,
      });

      const master = await getMasterById(parsed.masterId);
      const timeZone = master?.timezone ?? "Europe/Kyiv";
      const endKey = subscription.subscription_end_date
        ? formatDateKey(new Date(subscription.subscription_end_date), timeZone)
        : null;
      const endLabel = endKey ? formatDateLong(endKey) : "невідомо";

      await ctx.reply(
        `✅ Оплату прийнято! Підписка активна до ${endLabel}.\n\n` +
          "Відкрийте кабінет у Mini App, щоб керувати записами.",
      );
    } catch (error) {
      console.error("[bot payments] successful_payment:", error);
      await ctx.reply(
        "⚠️ Оплату отримано, але сталася помилка активації. Ми вже працюємо над цим.",
      );
    }
  });
}
