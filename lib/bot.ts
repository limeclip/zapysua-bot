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

async function sendMasterPanel(ctx: BotContext, master: Master): Promise<void> {
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
}

async function sendGuestHelp(ctx: BotContext): Promise<void> {
  const keyboard = new InlineKeyboard()
    .url("💼 Зареєструватися як майстер", getWebAppBaseUrl())
    .row()
    .text("❓ Як записатися?", "client_help");

  await ctx.reply(
    "👋 Ласкаво просимо до ZapysUa!\n\n" +
      "Щоб записатися до майстра, перейдіть за посиланням, яке він вам надав " +
      "(формат: t.me/…/app?startapp=slug).\n\n" +
      "Якщо у вас є slug майстра, надішліть команду:\n" +
      "/start slug_майстра",
    { reply_markup: keyboard },
  );
}

export const bot = new Bot<BotContext>(getBotToken());

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

  const master = ctx.master;
  if (master) {
    await sendMasterPanel(ctx, master);
    return;
  }

  await sendGuestHelp(ctx);
});

bot.callbackQuery("client_help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "📅 Як записатися:\n\n" +
      "1. Отримайте посилання від майстра (t.me/…/app?startapp=slug).\n" +
      "2. Перейдіть за ним — відкриється сторінка запису.\n\n" +
      "Або надішліть у чат: /start slug_майстра, потім натисніть «Записатися».",
  );
});
