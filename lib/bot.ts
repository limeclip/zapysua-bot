import { Bot, Keyboard, type MiddlewareFn } from "grammy";
import {
  getOrCreateMinimalMaster,
  isMasterOnboarded,
  setTelegramContext,
} from "@/lib/supabaseClient";
import type { BotContext } from "@/types";

function getBotToken(): string {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN не встановлено в змінних середовища");
  }
  return token;
}

function getWebAppUrl(): string {
  if (process.env.WEBAPP_URL) {
    return process.env.WEBAPP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function webAppKeyboard(buttonText: string) {
  return new Keyboard()
    .webApp(buttonText, getWebAppUrl())
    .resized();
}

export const bot = new Bot<BotContext>(getBotToken());

const masterMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const from = ctx.from;
  if (!from) {
    return next();
  }

  try {
    await setTelegramContext(from.id);

    const { master } = await getOrCreateMinimalMaster(
      from.id,
      from.username,
    );

    ctx.master = master;
  } catch (error) {
    console.error("[bot] masterMiddleware:", error);
    await ctx.reply(
      "⚠️ Не вдалося завантажити профіль. Спробуйте пізніше.",
    );
    return;
  }

  await next();
};

bot.use(masterMiddleware);

bot.command("start", async (ctx) => {
  if (!ctx.master) return;

  try {
    const onboarded = await isMasterOnboarded(ctx.master);

    if (!onboarded) {
      await ctx.reply(
        "🚀 Вітаємо в ZapysUa!\n\nНатисніть кнопку, щоб створити вашого AI-адміністратора за 2 хвилини.",
        { reply_markup: webAppKeyboard("Розпочати") },
      );
      return;
    }

    await ctx.reply(
      `Раді вас бачити, ${ctx.master.business_name}! 👋\n\nВідкрийте ваш кабінет, щоб керувати записами.`,
      { reply_markup: webAppKeyboard("Відкрити кабінет") },
    );
  } catch (error) {
    console.error("[bot] /start:", error);
    await ctx.reply("⚠️ Щось пішло не так. Спробуйте /start ще раз.");
  }
});
