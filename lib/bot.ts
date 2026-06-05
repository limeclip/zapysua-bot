import { Bot, InlineKeyboard, type MiddlewareFn } from "grammy";
import { findMasterByStartParam } from "@/lib/api/masters";
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

function extractStartPayload(ctx: BotContext): string {
  const text = ctx.message?.text ?? "";
  const fromMatch = String(ctx.match ?? "").trim();
  const fromText = text.split(/\s+/).slice(1).join(" ").trim();
  const payload = fromMatch || fromText;

  console.log("[bot /start] message.text:", text);
  console.log("[bot /start] ctx.match:", fromMatch || "(порожньо)");
  console.log("[bot /start] from text split:", fromText || "(порожньо)");
  console.log("[bot /start] START PAYLOAD:", payload || "(порожньо)");

  return payload;
}

async function sendClientWelcome(ctx: BotContext, master: Master): Promise<void> {
  const clientUrl = getClientAppUrl(master);
  console.log("[bot /start] client web_app URL:", clientUrl);

  const keyboard = new InlineKeyboard().webApp(
    "📅 Записатися на прийом",
    clientUrl,
  );

  const caption =
    `👋 Привіт!\n` +
    `Це AI-адміністратор *${master.business_name}*\n\n` +
    `Оберіть послугу та запишіться на зручний час.`;

  const plainText =
    `👋 Привіт!\n` +
    `Це AI-адміністратор ${master.business_name}\n\n` +
    `Натисніть кнопку нижче, щоб записатися:`;

  if (master.logo_url) {
    await ctx.replyWithPhoto(master.logo_url, {
      caption,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(plainText, { reply_markup: keyboard });
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
  await ctx.reply(
    "👋 Ласкаво просимо до ZapysUa!\n\n" +
      "Щоб записатися до майстра:\n" +
      "1. Перейдіть за посиланням від майстра (t.me/…?start=slug)\n" +
      "2. Якщо бот не відповів — надішліть у чат:\n" +
      "   /start slug_майстра\n" +
      "3. Натисніть кнопку «Записатися на прийом»\n\n" +
      "Майстер? Натисніть кнопку нижче:",
    {
      reply_markup: new InlineKeyboard().url(
        "💼 Зареєструватися як майстер",
        getWebAppBaseUrl(),
      ),
    },
  );
}

export const bot = new Bot<BotContext>(getBotToken());

// ========== /start — реєструємо першим (до middleware) ==========
bot.command("start", async (ctx) => {
  const payload = extractStartPayload(ctx);
  const fromId = ctx.from?.id;

  console.log("[bot /start] from user id:", fromId);

  if (payload && payload.toLowerCase() !== "start") {
    try {
      const referredMaster = await findMasterByStartParam(payload);
      console.log(
        "[bot /start] findMasterByStartParam:",
        referredMaster ? referredMaster.id : "не знайдено",
      );

      if (referredMaster) {
        await sendClientWelcome(ctx, referredMaster);
        return;
      }

      await ctx.reply(
        `Майстра «${payload}» не знайдено.\n\n` +
          "Перевірте посилання або надішліть:\n" +
          `/start ${payload}`,
      );
      return;
    } catch (error) {
      console.error("[bot /start] client flow error:", error);
      await ctx.reply("⚠️ Щось пішло не так. Спробуйте пізніше.");
      return;
    }
  }

  // Параметра немає — вхід для майстра або гостя
  let master: Master | null | undefined = ctx.master;
  if (!master && fromId) {
    try {
      await setTelegramContext(fromId);
      master = await getMasterByTelegramId(fromId);
    } catch (error) {
      console.error("[bot /start] master lookup error:", error);
    }
  }

  if (master) {
    console.log("[bot /start] master panel for:", master.business_name);
    await sendMasterPanel(ctx, master);
    return;
  }

  console.log("[bot /start] guest help (no payload, not a master)");
  await sendGuestHelp(ctx);
});

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
