import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN!);

function getMiniAppUrl(slug?: string) {
  const botUsername =
    process.env.NEXT_PUBLIC_BOT_USERNAME || "ZapysUaBot";

  if (!slug) {
    return `https://t.me/${botUsername}/app`;
  }

  return `https://t.me/${botUsername}/app?startapp=${encodeURIComponent(
    slug
  )}`;
}

bot.command("start", async (ctx) => {
  const payload =
    ctx.match ||
    ctx.message?.text?.split(" ").slice(1).join(" ");

  console.log("START PAYLOAD:", payload);

  // Если пришёл slug мастера
  if (payload) {
    const miniAppUrl = getMiniAppUrl(payload);

    console.log("MINI APP URL:", miniAppUrl);

    await ctx.reply(
      "Натисніть кнопку нижче для запису:",
      {
        reply_markup: new InlineKeyboard().url(
          "📅 Записатися",
          miniAppUrl
        ),
      }
    );

    return;
  }

  // Обычный старт
  await ctx.reply(
    "Відкрити Mini App:",
    {
      reply_markup: new InlineKeyboard().url(
        "🚀 Відкрити",
        getMiniAppUrl()
      ),
    }
  );
});

export default bot;