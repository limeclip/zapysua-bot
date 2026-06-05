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

// Middleware: тільки встановлюємо контекст, не створюємо майстра!
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
    // Не блокуємо виконання
  }
  await next();
};

bot.use(masterMiddleware);

bot.command("start", async (ctx) => {
  const payload = ctx.match; // параметр після /start
  console.log("📩 Отримано /start. Payload:", payload);
  await ctx.reply(`Отримано параметр: ${payload || "пусто"}`);
  
  // Додатковий лог для вебхука
  console.log(`Користувач ${ctx.from?.id} надіслав /start з параметром: ${payload}`);
});