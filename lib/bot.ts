import { Bot, InlineKeyboard, type MiddlewareFn } from "grammy";
import {
  findMasterByStartParam,
  getActiveServicesForMaster,
} from "@/lib/api/masters";
import { getClientAppUrl, getWebAppBaseUrl } from "@/lib/referral";
import {
  getMasterByTelegramId,
  setTelegramContext,
  needsOnboarding,
  hasAiSettings,
} from "@/lib/supabaseClient";
import type { BotContext, Master } from "@/types";

function getBotToken(): string {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN не встановлено в змінних середовища");
  }
  return token;
}

function webAppInlineKeyboard(buttonText: string, url?: string) {
  return new InlineKeyboard().webApp(
    buttonText,
    url ?? getWebAppBaseUrl(),
  );
}

async function sendClientWelcome(
  ctx: BotContext,
  master: Master,
): Promise<void> {
  const services = await getActiveServicesForMaster(master.id);
  const serviceNames = services.map((s) => s.name).slice(0, 3);
  const serviceText =
    serviceNames.length > 0
      ? serviceNames.join(", ")
      : "на будь-яку послугу";

  const text =
    `✨ Вітаємо в студії ${master.business_name}! ✨\n\n` +
    `Я — AI-адміністратор ${master.business_name}. Допоможу записатися на ${serviceText}.\n\n` +
    `Натисніть кнопку нижче, щоб переглянути послуги та обрати зручний час.`;

  const keyboard = webAppInlineKeyboard(
    "Записатися",
    getClientAppUrl(master),
  );

  if (master.logo_url) {
    await ctx.replyWithPhoto(master.logo_url, {
      caption: text,
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}

export const bot = new Bot<BotContext>(getBotToken());

// Middleware: только устанавливаем контекст, НЕ создаём мастера
const masterMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const from = ctx.from;
  if (!from) {
    return next();
  }

  try {
    await setTelegramContext(from.id);
    const master = await getMasterByTelegramId(from.id);
    ctx.master = master ?? undefined;
  } catch (error) {
    console.error("[bot] masterMiddleware:", error);
  }
  await next();
};

bot.use(masterMiddleware);

bot.command("start", async (ctx) => {
  const startParam = ctx.match?.trim() ?? "";

  // ========== 1. ЕСЛИ ЕСТЬ ПАРАМЕТР (КЛИЕНТ) ==========
  if (startParam) {
    try {
      const referredMaster = await findMasterByStartParam(startParam);
      if (!referredMaster) {
        await ctx.reply("Такого майстра не існує.");
        return;
      }
      await sendClientWelcome(ctx, referredMaster);
    } catch (error) {
      console.error("[bot] /start client:", error);
      await ctx.reply("⚠️ Щось пішло не так. Спробуйте пізніше.");
    }
    return;
  }

  // ========== 2. ПАРАМЕТРА НЕТ – ОПРЕДЕЛЯЕМ РОЛЬ ==========
  const master = ctx.master;

  // Если пользователь зарегистрирован как мастер – показываем панель мастера
  if (master) {
    const onboarded = await hasAiSettings(master.id);
    if (!onboarded || needsOnboarding(master)) {
      await ctx.reply(
        "🚀 Вітаємо в ZapysUa!\n\nНатисніть кнопку, щоб завершити реєстрацію та створити вашого AI-адміністратора.",
        { reply_markup: webAppInlineKeyboard("Розпочати") },
      );
      return;
    }
    await ctx.reply(
      `Раді вас бачити, ${master.business_name}! 👋\n\nВідкрийте ваш кабінет, щоб керувати записами.`,
      { reply_markup: webAppInlineKeyboard("Відкрити кабінет") },
    );
    return;
  }

  // ========== 3. НЕ МАСТЕР, НЕТ ПАРАМЕТРА – ПРЕДЛАГАЕМ ВЫБОР ==========
  // Показываем две кнопки: "Я мастер" и "Я клиент"
  const keyboard = new InlineKeyboard()
    .url("💼 Я мастер", getWebAppBaseUrl())
    .row()
    .text("📅 Я клиент", "client_help");

  await ctx.reply(
    "👋 Ласкаво просимо до ZapysUa!\n\n" +
    "Виберіть вашу роль:",
    { reply_markup: keyboard }
  );
});

// Обработчик нажатия на кнопку "Я клиент"
bot.callbackQuery("client_help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "Щоб записатися до майстра, скористайтеся посиланням, яке він вам надав.\n\n" +
    "Якщо у вас немає посилання, зверніться до майстра безпосередньо."
  );
});