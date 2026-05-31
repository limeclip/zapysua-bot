# ZapysUa Bot

Універсальний AI-адміністратор для запису клієнтів у Telegram.  
Стек: **Next.js + TypeScript + grammY + Supabase + Vercel**.

## Структура проекту

```
zapysua-bot/
├── app/
│   ├── api/webhook/route.ts   # Webhook для Telegram (grammY)
│   ├── layout.tsx             # Layout Mini App
│   ├── page.tsx               # Головна сторінка Mini App
│   └── globals.css
├── components/
│   └── TelegramWebAppInfo.tsx # Компонент даних Telegram WebApp
├── lib/
│   ├── bot.ts                 # Ініціалізація grammY бота
│   └── supabaseClient.ts      # Клієнт Supabase
├── scripts/
│   └── set-webhook.mjs        # Скрипт встановлення webhook
├── .env.example
└── package.json
```

## Швидкий старт (локально)

### 1. Клонування репозиторію

```bash
git clone https://github.com/YOUR_USERNAME/zapysua-bot.git
cd zapysua-bot
npm install
```

### 2. Створення Telegram-бота

1. Відкрийте [@BotFather](https://t.me/BotFather) у Telegram.
2. Надішліть `/newbot` і дотримуйтесь інструкцій.
3. Збережіть отриманий **BOT_TOKEN**.
4. (Рекомендовано) У BotFather: `/setdomain` → вкажіть домен Vercel після деплою.

### 3. Налаштування Supabase

1. Створіть проект на [supabase.com](https://supabase.com) (безкоштовний план).
2. Перейдіть у **Project Settings → API**.
3. Скопіюйте **Project URL** та **anon public key**.

### 4. Змінні середовища

Скопіюйте приклад і заповніть значення:

```bash
cp .env.example .env
```

| Змінна | Опис |
|--------|------|
| `BOT_TOKEN` | Токен бота від BotFather |
| `SUPABASE_URL` | URL проекту Supabase |
| `SUPABASE_ANON_KEY` | Anon key з Supabase |
| `WEBHOOK_URL` | URL webhook (після деплою: `https://your-app.vercel.app/api/webhook`) |
| `WEBAPP_URL` | URL Mini App (після деплою: `https://your-app.vercel.app`) |

### 5. Локальний запуск

```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) — побачите заглушку Mini App.

> **Примітка:** Webhook локально не працює без тунелю (ngrok / Cloudflare Tunnel). Для тестування бота потрібен деплой на Vercel.

---

## Деплой на Vercel

### 1. GitHub-репозиторій

Якщо репозиторій ще не створено:

```bash
git remote add origin https://github.com/YOUR_USERNAME/zapysua-bot.git
git branch -M main
git push -u origin main
```

### 2. Підключення до Vercel

1. Увійдіть на [vercel.com](https://vercel.com).
2. **Add New → Project** → імпортуйте `zapysua-bot`.
3. У **Environment Variables** додайте:
   - `BOT_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `WEBAPP_URL` = `https://your-app.vercel.app`
   - `WEBHOOK_URL` = `https://your-app.vercel.app/api/webhook`
4. Натисніть **Deploy**.

### 3. Встановлення webhook

Після успішного деплою оновіть `.env` (або експортуйте змінні) і виконайте:

```bash
npm run set-webhook
```

Альтернатива через curl (Linux/macOS):

```bash
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -F "url=$WEBHOOK_URL"
```

Перевірка webhook:

```bash
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

---

## Перевірка роботи

1. **Бот:** відкрийте бота в Telegram → `/start` → має прийти українське привітання.
2. **Кнопка Mini App:** після `/start` з'явиться кнопка **«Відкрити кабінет»**.
3. **Mini App:** відкривається сторінка з текстом «Ваш особистий кабінет ZapysUa незабаром буде доступний» та ім'ям користувача Telegram.
4. **Webhook:** у логах Vercel (Functions → `/api/webhook`) видно вхідні запити при повідомленнях боту.

---

## Команди

| Команда | Опис |
|---------|------|
| `npm run dev` | Локальна розробка |
| `npm run build` | Збірка проекту |
| `npm run start` | Запуск production-сервера |
| `npm run set-webhook` | Встановити Telegram webhook |
| `npm run lint` | Перевірка ESLint |

---

## Наступний етап

**Етап 1** — створення таблиць бази даних у Supabase (майстри, послуги, записи тощо).
