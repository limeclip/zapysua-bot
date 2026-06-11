import { Bot, InlineKeyboard, session, type MiddlewareFn } from "grammy";
import { findMasterByStartParam } from "@/lib/api/masters";
import { registerAiHandlers, sendAiWelcome } from "@/lib/bot-ai-handler";
import { getWebAppBaseUrl } from "@/lib/referral";
import {
  getMasterByTelegramId,
  setTelegramContext,
  needsOnboarding,
  hasAiSettings,
} from "@/lib/supabaseClient";
import { registerPaymentHandlers } from "@/lib/bot-payments";
import type { BotContext, Master, SessionData } from "@/types";

function getBotToken(): string {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN не встановлено");
  }
  return token;
}

function webAppInlineKeyboard(buttonText: string, url?: string) {
  return new InlineKeyboard().webApp(
    buttonText,
    url ?? getWebAppBaseUrl(),
  );
}

async function sendMasterPanel(
  ctx: BotContext,
  master: Master,
): Promise<void> {
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
  await ctx.reply(
    "👋 Ласкаво просимо до ZapysUa!\n\n" +
      "Щоб записатися до майстра, перейдіть за посиланням, яке він вам надав.\n\n" +
      "Майстер? Натисніть кнопку нижче:",
    {
      reply_markup: new InlineKeyboard().url(
        "Зареєструватися як майстер",
        getWebAppBaseUrl(),
      ),
    },
  );
}

export const bot = new Bot<BotContext>(getBotToken());

bot.use(
  session({
    initial: (): SessionData => ({}),
  }),
);

bot.command("start", async (ctx) => {
  const payload =
    String(ctx.match ?? "").trim() ||
    ctx.message?.text?.split(" ").slice(1).join(" ").trim() ||
    "";

  if (payload) {
    try {
      const referredMaster = await findMasterByStartParam(payload);

      if (referredMaster) {
        await sendAiWelcome(ctx, referredMaster);
        return;
      }

      await ctx.reply(`Майстра «${payload}» не знайдено.`);
      return;
    } catch (error) {
      console.error("[bot /start] client flow:", error);
      await ctx.reply("⚠️ Щось пішло не так. Спробуйте пізніше.");
      return;
    }
  }

  const fromId = ctx.from?.id;
  let master: Master | null | undefined = ctx.master;

  if (!master && fromId) {
    try {
      await setTelegramContext(fromId);
      master = await getMasterByTelegramId(fromId);
    } catch (error) {
      console.error("[bot /start] master lookup:", error);
    }
  }

  if (master) {
    await sendMasterPanel(ctx, master);
    return;
  }

  await sendGuestHelp(ctx);
});

const masterMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const from = ctx.from;
  if (!from) return next();

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

registerAiHandlers(bot);
registerPaymentHandlers(bot);
