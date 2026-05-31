import { Bot, InlineKeyboard } from "grammy";

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

export const bot = new Bot(getBotToken());

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp(
    "Відкрити кабінет",
    getWebAppUrl(),
  );

  await ctx.reply(
    "Привіт! Я — AI-адміністратор ZapysUa 🤖 Допомагаю майстрам приймати записи 24/7. Зареєструйтесь, щоб створити персональну сторінку запису.",
    { reply_markup: keyboard },
  );
});
