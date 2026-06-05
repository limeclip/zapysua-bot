import { Bot, InlineKeyboard, type MiddlewareFn } from "grammy";

import { findMasterByStartParam } from "@/lib/api/masters";

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
    throw new Error("BOT_TOKEN не встановлено");
  }

  return token;
}

function getBotUsername(): string {
  return process.env.NEXT_PUBLIC_BOT_USERNAME || "ZapysUaBot";
}

function getMiniAppUrl(slug?: string): string {
  const botUsername = getBotUsername();

  if (!slug) {
    return `https://t.me/${botUsername}/app`;
  }

  return `https://t.me/${botUsername}/app?startapp=${encodeURIComponent(slug)}`;
}

export const bot = new Bot<BotContext>(getBotToken());

async function sendClientWelcome(
  ctx: BotContext,
  master: Master
): Promise<void> {

  const miniAppUrl = getMiniAppUrl(master.slug ?? undefined);

  console.log("MINI APP URL:", miniAppUrl);

  const keyboard = new InlineKeyboard().url(
    "📅 Записатися на прийом",
    miniAppUrl
  );

  const text =
    `👋 Привіт!\n\n` +
    `Ви відкрили запис до ${master.business_name}\n\n` +
    `Натисніть кнопку нижче для запису.`;

  await ctx.reply(text, {
    reply_markup: keyboard,
  });
}

async function sendMasterPanel(
  ctx: BotContext,
  master: Master
): Promise<void> {

  const onboarded = await hasAiSettings(master.id);

  if (!onboarded || needsOnboarding(master)) {

    await ctx.reply(
      "🚀 Завершіть налаштування вашого кабінету",
      {
        reply_markup: new InlineKeyboard().url(
          "Відкрити кабінет",
          getMiniAppUrl()
        ),
      }
    );

    return;
  }

  await ctx.reply(
    `👋 Вітаємо, ${master.business_name}`,
    {
      reply_markup: new InlineKeyboard().url(
        "Відкрити кабінет",
        getMiniAppUrl()
      ),
    }
  );
}

async function sendGuestHelp(ctx: BotContext): Promise<void> {

  await ctx.reply(
    "👋 Ласкаво просимо до ZapysUa",
    {
      reply_markup: new InlineKeyboard().url(
        "Відкрити Mini App",
        getMiniAppUrl()
      ),
    }
  );
}

bot.command("start", async (ctx) => {

  const payload =
    String(ctx.match ?? "").trim() ||
    ctx.message?.text?.split(" ").slice(1).join(" ").trim();

  console.log("START PAYLOAD:", payload);

  /**
   * CLIENT FLOW
   */
  if (payload) {

    try {

      const referredMaster =
        await findMasterByStartParam(payload);

      console.log(
        "REFERRED MASTER:",
        referredMaster?.slug
      );

      if (referredMaster) {

        await sendClientWelcome(
          ctx,
          referredMaster
        );

        return;
      }

      await ctx.reply(
        `Майстра "${payload}" не знайдено`
      );

      return;

    } catch (error) {

      console.error(
        "CLIENT FLOW ERROR:",
        error
      );

      await ctx.reply(
        "⚠️ Помилка"
      );

      return;
    }
  }

  /**
   * MASTER FLOW
   */
  const fromId = ctx.from?.id;

  let master: Master | null | undefined =
    ctx.master;

  if (!master && fromId) {

    try {

      await setTelegramContext(fromId);

      master =
        await getMasterByTelegramId(fromId);

    } catch (error) {

      console.error(
        "MASTER LOOKUP ERROR:",
        error
      );
    }
  }

  if (master) {

    await sendMasterPanel(
      ctx,
      master
    );

    return;
  }

  /**
   * GUEST
   */
  await sendGuestHelp(ctx);
});

/**
 * MIDDLEWARE
 */
const masterMiddleware: MiddlewareFn<BotContext> =
  async (ctx, next) => {

    const from = ctx.from;

    if (!from) {
      return next();
    }

    try {

      await setTelegramContext(from.id);

      const master =
        await getMasterByTelegramId(from.id);

      ctx.master = master ?? undefined;

    } catch (error) {

      console.error(
        "MIDDLEWARE ERROR:",
        error
      );
    }

    await next();
  };

bot.use(masterMiddleware);