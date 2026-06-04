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
  const startParam = ctx.match?.trim() ?? "";

  // Випадок 1: є параметр start (клієнтське посилання)
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

  // Випадок 2: немає параметра – працюємо з майстром
  const master = ctx.master;
  if (!master) {
    // Користувач не є майстром
    await ctx.reply(
      "👋 Вітаємо в ZapysUa!\n\n" +
      "Ви ще не зареєстровані як майстер. Бажаєте створити свого AI-адміністратора?",
      {
        reply_markup: new InlineKeyboard().url(
          "Розпочати реєстрацію",
          getWebAppBaseUrl(),
        ),
      },
    );
    return;
  }

  // Майстер існує – перевіряємо статус онбордингу
  const onboarded = await hasAiSettings(master.id);
  if (!onboarded || needsOnboarding(master)) {
    await ctx.reply(
      "🚀 Вітаємо в ZapysUa!\n\nНатисніть кнопку, щоб завершити реєстрацію та створити вашого AI-адміністратора.",
      { reply_markup: webAppInlineKeyboard("Розпочати") },
    );
    return;
  }

  // Зареєстрований майстер
  await ctx.reply(
    `Раді вас бачити, ${master.business_name}! 👋\n\nВідкрийте ваш кабінет, щоб керувати записами.`,
    { reply_markup: webAppInlineKeyboard("Відкрити кабінет") },
  );
});