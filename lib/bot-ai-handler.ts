import { InlineKeyboard, type Bot } from "grammy";
import { generateAIResponse, MAX_HISTORY } from "@/lib/ai";
import {
  executeAiAction,
  formatClientBookingsText,
  formatServicesListText,
  getAiHelpText,
  getSlotsForAction,
} from "@/lib/ai-tools";
import { getMasterContext } from "@/lib/ai-context";
import { getClientAppUrl } from "@/lib/referral";
import type { BotContext, Master } from "@/types";
import type { AiActionShowSlots, AiConversationMessage } from "@/types/ai";

function buildAiWelcomeText(businessName: string): string {
  return (
    `👋 Привіт! Я AI-адміністратор студії «${businessName}».\n\n` +
    `Я можу допомогти тобі:\n` +
    `• Записатися на послугу\n` +
    `• Розповісти про ціни та послуги\n` +
    `• Показати твої записи\n` +
    `• Перенести або скасувати запис\n\n` +
    `Просто напиши мені, що тобі потрібно, або скористайся кнопками нижче.`
  );
}

export function buildAiWelcomeKeyboard(master: Master): InlineKeyboard {
  const mid = master.id;
  return new InlineKeyboard()
    .text("Записатися", `ai_book|${mid}`)
    .text("Послуги", `ai_services|${mid}`)
    .row()
    .text("Мої записи", `ai_my_bookings|${mid}`)
    .text("Допомога", `ai_help|${mid}`)
    .row()
    .webApp("Відкрити Mini App", getClientAppUrl(master));
}

export async function sendAiWelcome(
  ctx: BotContext,
  master: Master,
): Promise<void> {
  // Все одно зберігаємо в сесію для текстових повідомлень
  ctx.session.masterId = master.id;
  ctx.session.history = [];
  console.log(`[AI] Сесія збережена: masterId=${ctx.session.masterId}`);

  const text = buildAiWelcomeText(master.business_name);
  const keyboard = buildAiWelcomeKeyboard(master);

  if (master.logo_url) {
    await ctx.replyWithPhoto(master.logo_url, {
      caption: text,
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}

function getClientName(ctx: BotContext): string {
  const from = ctx.from;
  if (!from) return "Клієнт";
  const parts = [from.first_name, from.last_name].filter(Boolean);
  return parts.join(" ") || from.username || "Клієнт";
}

function pushHistory(
  session: BotContext["session"],
  userMessage: string,
  assistantMessage: string,
): void {
  const history: AiConversationMessage[] = session.history ?? [];
  history.push({ role: "user", content: userMessage });
  history.push({ role: "assistant", content: assistantMessage });
  session.history = history.slice(-MAX_HISTORY);
}

async function processAiMessage(
  ctx: BotContext,
  masterId: string,
  userMessage: string,
): Promise<void> {
  const telegramId = ctx.from?.id;
  const history = ctx.session.history ?? [];

  console.log(`[AI] Обробка повідомлення: "${userMessage}" для masterId=${masterId}`);

  try {
    const aiResponse = await generateAIResponse(
      masterId,
      userMessage,
      history,
      telegramId?.toString(),
    );

    let replyText = aiResponse.reply;

    if (aiResponse.action) {
      const actionResult = await executeAiAction({
        masterId,
        action: aiResponse.action,
        clientTelegramId: telegramId,
        clientName: getClientName(ctx),
      });

      if (actionResult.message) {
        replyText = replyText
          ? `${replyText}\n\n${actionResult.message}`
          : actionResult.message;
      }

      if (
        aiResponse.action.action === "show_slots" &&
        !actionResult.message.includes("немає вільних") &&
        !actionResult.message.includes("вихідний день")
      ) {
        await sendSlotsKeyboard(ctx, masterId, aiResponse.action);
      }
    }

    if (!replyText.trim()) {
      replyText = "Готово!";
    }

    await ctx.reply(replyText);
    pushHistory(ctx.session, userMessage, replyText);
  } catch (error) {
    console.error("[AI] Помилка в processAiMessage:", error);
    await ctx.reply("Вибачте, сталася помилка. Спробуйте пізніше.");
  }
}

async function sendSlotsKeyboard(
  ctx: BotContext,
  masterId: string,
  action: AiActionShowSlots,
): Promise<void> {
  const context = await getMasterContext(masterId, ctx.from?.id?.toString());
  if (!context) return;

  const slots = await getSlotsForAction(masterId, action, context);
  if (slots.length === 0) return;

  ctx.session.pendingSlots = slots.map((slot) => ({
    serviceId: action.serviceId,
    startTime: slot.startTime,
  }));

  const keyboard = new InlineKeyboard();
  slots.slice(0, 12).forEach((slot, index) => {
    if (index > 0 && index % 3 === 0) keyboard.row();
    // додаємо masterId в дані кнопки
    keyboard.text(slot.label, `ai_slot|${masterId}|${index}`);
  });

  await ctx.reply("Оберіть зручний час:", { reply_markup: keyboard });
}

async function sendServicesWithBookButtons(
  ctx: BotContext,
  masterId: string,
): Promise<void> {
  const context = await getMasterContext(masterId, ctx.from?.id?.toString());
  if (!context) {
    await ctx.reply("Майстра не знайдено.");
    return;
  }

  const text = `Ось наші послуги:\n\n${formatServicesListText(context)}`;
  const keyboard = new InlineKeyboard();

  context.services.forEach((service, index) => {
    if (index > 0) keyboard.row();
    keyboard.text(
      `Записатися: ${service.name}`,
      `ai_book_service|${masterId}|${service.id}`,
    );
  });

  await ctx.reply(text, {
    reply_markup: context.services.length > 0 ? keyboard : undefined,
  });
}

async function handleQuickAction(
  ctx: BotContext,
  masterId: string,
  message: string,
): Promise<void> {
  await processAiMessage(ctx, masterId, message);
}

export function registerAiHandlers(bot: Bot<BotContext>): void {
  // Обробник callback-запитів
  bot.callbackQuery(/^ai_/, async (ctx) => {
    await ctx.answerCallbackQuery();

    const data = ctx.callbackQuery.data ?? "";
    const parts = data.split("|");
    const action = parts[0];
    const masterId = parts[1];
    const extra = parts[2];

    if (!masterId) {
      console.log("[AI] Немає masterId в callback data");
      await ctx.reply("Спочатку перейдіть за посиланням майстра (/start slug).");
      return;
    }

    // Оновлюємо сесію (для історії)
    ctx.session.masterId = masterId;

    if (action === "ai_book") {
      await handleQuickAction(ctx, masterId, "Хочу записатися на послугу. Допоможи мені обрати послугу, дату та час.");
      return;
    }

    if (action === "ai_services") {
      await sendServicesWithBookButtons(ctx, masterId);
      return;
    }

    if (action === "ai_my_bookings") {
      const context = await getMasterContext(masterId, ctx.from?.id?.toString());
      const text = context
        ? formatClientBookingsText(context)
        : "У вас немає майбутніх записів.";
      await ctx.reply(`Ваші записи:\n\n${text}`);
      return;
    }

    if (action === "ai_help") {
      await ctx.reply(getAiHelpText());
      return;
    }

    if (action === "ai_book_service" && extra) {
      const serviceId = extra;
      await handleQuickAction(ctx, masterId, `Хочу записатися на послугу з id ${serviceId}. Допоможи обрати дату та час.`);
      return;
    }

    if (action === "ai_slot" && extra) {
      const index = Number.parseInt(extra, 10);
      const slot = ctx.session.pendingSlots?.[index];
      if (!slot) return;
      await handleQuickAction(ctx, masterId, `Запиши мене на послугу ${slot.serviceId} на ${slot.startTime}`);
      return;
    }
  });

  // Обробник текстових повідомлень – залишається, але тепер покладається на сесію
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text.trim();
    console.log(`[AI] Отримано текст: "${text}"`);

    if (text.startsWith("/")) {
      return next();
    }

    if (ctx.master) {
      console.log("[AI] Користувач є майстром, пропускаємо");
      return next();
    }

    const masterId = ctx.session.masterId;
    if (!masterId) {
      console.log("[AI] Немає masterId в сесії, пропускаємо");
      return next();
    }

    console.log(`[AI] Передаємо повідомлення в AI для masterId=${masterId}`);
    await processAiMessage(ctx, masterId, text);
  });
}

export { buildAiWelcomeText, getAiHelpText };