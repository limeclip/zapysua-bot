import {
  Bot,
  InlineKeyboard,
  Keyboard,
  type MiddlewareFn,
} from "grammy";
import { sessionMiddleware } from "@/lib/session";
import {
  CATEGORY_LABELS,
  createService,
  deleteService,
  ensureMasterDefaults,
  getOnboardingStep,
  getOrCreateMinimalMaster,
  getServices,
  isMasterOnboarded,
  setTelegramContext,
  updateMaster,
} from "@/lib/supabaseClient";
import type { BotContext, MasterCategory } from "@/types";

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

export const bot = new Bot<BotContext>(getBotToken());

bot.use(sessionMiddleware);

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

function mainMenuKeyboard() {
  return new Keyboard()
    .text("📋 Мої послуги")
    .text("➕ Додати послугу")
    .row()
    .text("📅 Записи")
    .text("⚙️ Налаштування")
    .row()
    .webApp("🌐 Відкрити кабінет", getWebAppUrl())
    .resized();
}

function categoryKeyboard() {
  const keyboard = new InlineKeyboard();
  const categories: MasterCategory[] = [
    "beauty",
    "health",
    "education",
    "auto",
    "other",
  ];

  categories.forEach((cat, index) => {
    keyboard.text(CATEGORY_LABELS[cat], `category_${cat}`);
    if (index % 2 === 1) {
      keyboard.row();
    }
  });

  return keyboard;
}

function skipLocationKeyboard() {
  return new InlineKeyboard().text("⏭ Пропустити", "skip_location");
}

async function showMainMenu(ctx: BotContext, text: string) {
  await ctx.reply(text, { reply_markup: mainMenuKeyboard() });
}

async function startOnboarding(ctx: BotContext) {
  if (!ctx.master) return;

  const step = getOnboardingStep(ctx.master);

  ctx.session.onboarding = {
    business_name:
      step === "name" ? undefined : ctx.master.business_name,
    category: ctx.master.category,
    location: ctx.master.location ?? undefined,
  };

  if (step === "name") {
    ctx.session.step = "onboarding_name";
    await ctx.reply(
      "👋 Вітаємо в ZapysUa!\n\nДавайте налаштуємо ваш профіль.\n\nВведіть назву вашої студії або ваше ім'я:",
      { reply_markup: { remove_keyboard: true } },
    );
    return;
  }

  if (step === "category") {
    await ctx.reply("Оберіть категорію:", {
      reply_markup: categoryKeyboard(),
    });
    return;
  }
}

async function finishOnboarding(ctx: BotContext) {
  if (!ctx.master || !ctx.session.onboarding?.business_name) {
    await ctx.reply("⚠️ Помилка онбордингу. Надішліть /start ще раз.");
    return;
  }

  const { business_name, category } = ctx.session.onboarding;
  const location = ctx.session.onboarding.location ?? null;

  try {
    await setTelegramContext(ctx.master.telegram_id);

    ctx.master = await updateMaster(ctx.master.id, ctx.master.telegram_id, {
      business_name,
      category: category ?? "other",
      location,
      username: ctx.from?.username ?? ctx.master.username,
    });

    await ensureMasterDefaults(ctx.master.id, ctx.master.telegram_id);

    ctx.session.step = undefined;
    ctx.session.onboarding = undefined;

    await showMainMenu(
      ctx,
      "🎉 Вітаємо! Ваш AI-адміністратор готовий.\n\nТепер ви можете додавати послуги.",
    );
  } catch (error) {
    console.error("[bot] finishOnboarding:", error);
    await ctx.reply("⚠️ Не вдалося зберегти профіль. Спробуйте ще раз.");
  }
}

async function showServicesList(ctx: BotContext) {
  if (!ctx.master) return;

  try {
    await setTelegramContext(ctx.master.telegram_id);
    const services = await getServices(ctx.master.id);

    if (services.length === 0) {
      const keyboard = new InlineKeyboard().text(
        "➕ Додати послугу",
        "add_service",
      );

      await ctx.reply(
        "У вас поки немає послуг.\n\nДодайте першу послугу, щоб клієнти могли записуватися.",
        { reply_markup: keyboard },
      );
      return;
    }

    const lines = services.map(
      (s) => `• ${s.name} — ${s.price} грн (${s.duration_minutes} хв)`,
    );

    const keyboard = new InlineKeyboard();

    services.forEach((service) => {
      keyboard
        .text(`🗑 ${service.name}`, `delete_service_${service.id}`)
        .row();
    });

    keyboard.text("➕ Додати послугу", "add_service");

    await ctx.reply(
      `📋 **Ваші послуги:**\n\n${lines.join("\n")}`,
      { parse_mode: "Markdown", reply_markup: keyboard },
    );
  } catch (error) {
    console.error("[bot] showServicesList:", error);
    await ctx.reply("⚠️ Не вдалося завантажити послуги.");
  }
}

async function startAddService(ctx: BotContext) {
  ctx.session.step = "add_service_name";
  ctx.session.newService = {};

  await ctx.reply("📝 Введіть назву послуги:");
}

bot.command("start", async (ctx) => {
  if (!ctx.master) return;

  try {
    const onboarded = await isMasterOnboarded(ctx.master);

    if (!onboarded) {
      await startOnboarding(ctx);
      return;
    }

    await showMainMenu(
      ctx,
      `Привіт, ${ctx.master.business_name}! 👋\n\nЯ — AI-адміністратор ZapysUa 🤖\nОберіть дію в меню нижче.`,
    );
  } catch (error) {
    console.error("[bot] /start:", error);
    await ctx.reply("⚠️ Щось пішло не так. Спробуйте /start ще раз.");
  }
});

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCallbackQuery();

  if (!ctx.master) return;

  try {
    if (data.startsWith("category_")) {
      const category = data.replace("category_", "") as MasterCategory;

      if (!ctx.session.onboarding) {
        ctx.session.onboarding = {};
      }

      ctx.session.onboarding.category = category;
      ctx.session.step = "onboarding_location";

      await setTelegramContext(ctx.master.telegram_id);
      ctx.master = await updateMaster(ctx.master.id, ctx.master.telegram_id, {
        category,
      });

      await ctx.reply(
        "📍 Введіть вашу адресу або місто (необов'язково):",
        { reply_markup: skipLocationKeyboard() },
      );
      return;
    }

    if (data === "skip_location") {
      ctx.session.onboarding = ctx.session.onboarding ?? {};
      ctx.session.onboarding.location = undefined;
      await finishOnboarding(ctx);
      return;
    }

    if (data === "add_service") {
      await startAddService(ctx);
      return;
    }

    if (data.startsWith("delete_service_")) {
      const serviceId = data.replace("delete_service_", "");
      ctx.session.pendingDeleteServiceId = serviceId;

      const keyboard = new InlineKeyboard()
        .text("✅ Так, видалити", `confirm_delete_${serviceId}`)
        .text("❌ Скасувати", "cancel_delete");

      await ctx.reply("Ви впевнені, що хочете видалити цю послугу?", {
        reply_markup: keyboard,
      });
      return;
    }

    if (data.startsWith("confirm_delete_")) {
      const serviceId = data.replace("confirm_delete_", "");

      await setTelegramContext(ctx.master.telegram_id);
      await deleteService(serviceId, ctx.master.id, ctx.master.telegram_id);

      ctx.session.pendingDeleteServiceId = undefined;
      await ctx.reply("✅ Послугу видалено.");
      await showServicesList(ctx);
      return;
    }

    if (data === "cancel_delete") {
      ctx.session.pendingDeleteServiceId = undefined;
      await ctx.reply("Скасовано.");
      return;
    }

    if (data === "skip_description") {
      if (!ctx.session.newService?.name || !ctx.session.newService.price || !ctx.session.newService.duration_minutes) {
        await ctx.reply("⚠️ Помилка. Почніть додавання послуги заново.");
        return;
      }

      await setTelegramContext(ctx.master.telegram_id);
      await createService(ctx.master.id, ctx.master.telegram_id, {
        name: ctx.session.newService.name,
        price: ctx.session.newService.price,
        duration_minutes: ctx.session.newService.duration_minutes,
      });

      ctx.session.step = undefined;
      ctx.session.newService = undefined;

      await ctx.reply("✅ Послугу додано!");
      await showServicesList(ctx);
      return;
    }
  } catch (error) {
    console.error("[bot] callback_query:", error);
    await ctx.reply("⚠️ Помилка обробки дії. Спробуйте ще раз.");
  }
});

bot.on("message:text", async (ctx) => {
  if (!ctx.master) return;

  const text = ctx.message.text.trim();

  if (text.startsWith("/")) {
    return;
  }

  try {
    if (ctx.session.step === "onboarding_name") {
      if (text.length < 2) {
        await ctx.reply("Будь ласка, введіть назву (мінімум 2 символи):");
        return;
      }

      ctx.session.onboarding = { business_name: text };

      await setTelegramContext(ctx.master.telegram_id);
      ctx.master = await updateMaster(ctx.master.id, ctx.master.telegram_id, {
        business_name: text,
      });

      await ctx.reply("Оберіть категорію:", {
        reply_markup: categoryKeyboard(),
      });
      return;
    }

    if (ctx.session.step === "onboarding_location") {
      ctx.session.onboarding = ctx.session.onboarding ?? {};
      ctx.session.onboarding.location = text;
      await finishOnboarding(ctx);
      return;
    }

    if (ctx.session.step === "add_service_name") {
      if (text.length < 2) {
        await ctx.reply("Назва занадто коротка. Спробуйте ще раз:");
        return;
      }

      ctx.session.newService = { name: text };
      ctx.session.step = "add_service_price";
      await ctx.reply("💰 Введіть ціну в гривнях (ціле число):");
      return;
    }

    if (ctx.session.step === "add_service_price") {
      const price = parseInt(text, 10);

      if (Number.isNaN(price) || price < 0) {
        await ctx.reply("Введіть коректну ціну (ціле число, наприклад 500):");
        return;
      }

      ctx.session.newService = ctx.session.newService ?? {};
      ctx.session.newService.price = price;
      ctx.session.step = "add_service_duration";
      await ctx.reply("⏱ Введіть тривалість у хвилинах (ціле число):");
      return;
    }

    if (ctx.session.step === "add_service_duration") {
      const duration = parseInt(text, 10);

      if (Number.isNaN(duration) || duration <= 0) {
        await ctx.reply("Введіть коректну тривалість (наприклад 60):");
        return;
      }

      ctx.session.newService = ctx.session.newService ?? {};
      ctx.session.newService.duration_minutes = duration;
      ctx.session.step = "add_service_description";

      const keyboard = new InlineKeyboard().text(
        "⏭ Пропустити",
        "skip_description",
      );

      await ctx.reply("📄 Введіть опис послуги (необов'язково):", {
        reply_markup: keyboard,
      });
      return;
    }

    if (ctx.session.step === "add_service_description") {
      if (!ctx.session.newService?.name || ctx.session.newService.price === undefined || !ctx.session.newService.duration_minutes) {
        await ctx.reply("⚠️ Помилка. Почніть додавання послуги заново.");
        return;
      }

      await setTelegramContext(ctx.master.telegram_id);
      await createService(ctx.master.id, ctx.master.telegram_id, {
        name: ctx.session.newService.name,
        price: ctx.session.newService.price,
        duration_minutes: ctx.session.newService.duration_minutes,
        description: text,
      });

      ctx.session.step = undefined;
      ctx.session.newService = undefined;

      await ctx.reply("✅ Послугу додано!");
      await showServicesList(ctx);
      return;
    }

    switch (text) {
      case "📋 Мої послуги":
        await showServicesList(ctx);
        break;

      case "➕ Додати послугу":
        await startAddService(ctx);
        break;

      case "📅 Записи":
        await ctx.reply(
          "📅 Розділ «Записи» незабаром буде доступний.\n\nТут ви зможете переглядати та керувати записами клієнтів.",
        );
        break;

      case "⚙️ Налаштування":
        await ctx.reply(
          "⚙️ Розділ «Налаштування» незабаром буде доступний.\n\nТут ви зможете налаштувати AI-адміністратора, графік роботи та інше.",
        );
        break;

      default:
        if (!(await isMasterOnboarded(ctx.master))) {
          await ctx.reply(
            "Будь ласка, завершіть реєстрацію. Надішліть /start",
          );
        } else {
          await ctx.reply("Оберіть дію з меню нижче 👇");
        }
        break;
    }
  } catch (error) {
    console.error("[bot] message:text:", error);
    await ctx.reply("⚠️ Помилка обробки повідомлення. Спробуйте ще раз.");
  }
});
