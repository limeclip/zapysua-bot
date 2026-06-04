import { Bot, InlineKeyboard, type MiddlewareFn } from "grammy";
import {
  findMasterByStartParam,
  getActiveServicesForMaster,
} from "@/lib/api/masters";
import {
  getClientAppUrl,
  getReferralLink,
  getWebAppBaseUrl,
} from "@/lib/referral";
import {
  getOrCreateMinimalMaster,
  isMasterOnboarded,
  setTelegramContext,
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

export { getReferralLink };

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
  const startParam = ctx.match?.trim() ?? "";

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

  if (!ctx.master) return;

  try {
    const onboarded = await isMasterOnboarded(ctx.master);

    if (!onboarded) {
      await ctx.reply(
        "🚀 Вітаємо в ZapysUa!\n\nНатисніть кнопку, щоб створити вашого AI-адміністратора за 2 хвилини.",
        { reply_markup: webAppInlineKeyboard("Розпочати") },
      );
      return;
    }

    await ctx.reply(
      `Раді вас бачити, ${ctx.master.business_name}! 👋\n\nВідкрийте ваш кабінет, щоб керувати записами.`,
      { reply_markup: webAppInlineKeyboard("Відкрити кабінет") },
    );
  } catch (error) {
    console.error("[bot] /start:", error);
    await ctx.reply("⚠️ Щось пішло не так. Спробуйте /start ще раз.");
  }
});
