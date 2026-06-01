# Етап 3 — Mini App + API

## Створені / змінені файли

### API
- `app/api/onboarding/route.ts`
- `app/api/masters/me/route.ts`
- `app/api/masters/logo/route.ts`
- `app/api/masters/working-hours/route.ts`
- `app/api/masters/ai-tone/route.ts`
- `app/api/services/route.ts`

### Lib
- `lib/supabase/server.ts` — service role клієнт
- `lib/telegram/auth.ts` — валідація initData
- `lib/api/masters.ts`, `lib/api/response.ts`, `lib/api/client.ts`
- `lib/working-hours.ts`
- `lib/bot.ts` — лише `/start` + WebApp кнопка

### Mini App
- `components/MiniAppShell.tsx`
- `components/onboarding/OnboardingWizard.tsx`
- `components/dashboard/*`
- `components/shared/*`
- `components/ui/*`
- `components/providers/*`

### Інше
- `supabase/migrations/002_ai_tone_caring.sql`
- `supabase/migrations/003_storage_logos.sql`
- `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

## Налаштування

### 1. Змінні середовища (.env та Vercel)

```env
BOT_TOKEN=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # обов'язково для API
WEBHOOK_URL=https://your-app.vercel.app/api/webhook
WEBAPP_URL=https://your-app.vercel.app
NEXT_PUBLIC_BOT_USERNAME=YourBotUsername
```

### 2. Supabase SQL

1. Виконайте `002_ai_tone_caring.sql` (тон `caring`)
2. Виконайте `003_storage_logos.sql` (bucket `logos`)

Або в Dashboard → Storage → New bucket → `logos`, Public: ON

### 3. BotFather

```
/setdomain → your-app.vercel.app
```

## Локальний запуск

```bash
npm install
npm run dev
```

Для тесту без Telegram (браузер):

```env
NEXT_PUBLIC_DEV_TELEGRAM_ID=ваш_telegram_id
```

Відкрийте http://localhost:3000

## Тест через ngrok + Telegram

```bash
ngrok http 3000
```

Оновіть `.env`:

```env
WEBAPP_URL=https://xxxx.ngrok-free.app
WEBHOOK_URL=https://xxxx.ngrok-free.app/api/webhook
```

```bash
npm run set-webhook
```

У Telegram: `/start` → «Розпочати» → онбординг у Mini App.

## Деплой Vercel

1. Push на GitHub
2. Vercel → Environment Variables (усі з .env)
3. Deploy
4. `npm run set-webhook` з production URL

## Перевірка

- [ ] `/start` — одна кнопка WebApp
- [ ] Онбординг 6 кроків у Mini App
- [ ] Дашборд з Tab Bar
- [ ] CRUD послуг
- [ ] Налаштування: логотип, години, тон, посилання
- [ ] Перемикання теми світла/темна
