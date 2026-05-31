# Схема бази даних ZapysUa

Документація до міграції `supabase/migrations/001_initial_schema.sql`.

## Як застосувати

1. Відкрийте [Supabase Dashboard](https://supabase.com/dashboard) → ваш проект.
2. Перейдіть у **SQL Editor** → **New query**.
3. Вставте вміст файлу `001_initial_schema.sql` і натисніть **Run**.

Або через CLI:

```bash
supabase db push
```

---

## Таблиці

### `masters` — провайдери послуг (tenant)

Центральна таблиця системи. Кожен майстер (студія, репетитор, психолог тощо) — окремий tenant.

| Поле | Опис |
|------|------|
| `telegram_id` | Унікальний Telegram ID — основний ідентифікатор для RLS |
| `business_name` | Назва бізнесу |
| `category` | `beauty`, `health`, `education`, `auto`, `other` |
| `working_hours` | JSON-графік роботи по днях тижня |
| `timezone` | Часовий пояс (за замовчуванням `Europe/Kyiv`) |

### `subscriptions` — підписки

Триали та платні плани. Один майстер може мати кілька записів (історія підписок).

| Поле | Опис |
|------|------|
| `status` | `trial` → `active` → `expired` / `cancelled` |
| `plan_type` | `basic` або `pro` |
| `stars_amount` | Оплата через Telegram Stars |

### `services` — послуги

Каталог послуг майстра: назва, ціна (грн), тривалість.

### `bookings` — записи клієнтів

Основна операційна таблиця. Зберігає час запису, клієнта, послугу та статус.

| Статус | Значення |
|--------|----------|
| `pending` | Очікує підтвердження |
| `confirmed` | Підтверджено |
| `cancelled` | Скасовано |
| `completed` | Відбулось |
| `no_show` | Клієнт не прийшов |

### `ai_settings` — налаштування AI

Один запис на майстра (1:1). Промпт, тон спілкування, перемикачі нагадувань.

### `notifications` — журнал повідомлень

Лог відправлених Telegram-повідомлень (нагадування, підтвердження, повернення клієнтів).

---

## Зв'язки між таблицями

```
masters (1) ──< subscriptions (N)
masters (1) ──< services (N)
masters (1) ──< bookings (N)
masters (1) ─── ai_settings (1)

services (1) ──< bookings (N)   [ON DELETE SET NULL]

bookings (1) ──< notifications (N)
```

- Видалення **master** каскадно видаляє subscriptions, services, bookings, ai_settings.
- Видалення **service** обнуляє `bookings.service_id`.
- Видалення **booking** каскадно видаляє notifications.

---

## RLS (Row Level Security)

### Як працює ізоляція

1. Бекенд (webhook) викликає `set_telegram_context(telegram_id)` перед запитами.
2. Функція `current_master_id()` знаходить `masters.id` за `telegram_id`.
3. Політики дозволяють доступ лише до рядків з відповідним `master_id`.

### Приклад з Next.js (service role — обходить RLS)

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // тільки на сервері!
);

// Реєстрація нового майстра
await supabase.from("masters").insert({
  telegram_id: 123456789,
  business_name: "Студія краси Олена",
  category: "beauty",
});
```

### Приклад з RLS (anon/authenticated + context)

```typescript
await supabase.rpc("set_telegram_context", { tg_id: 123456789 });
const { data } = await supabase.from("bookings").select("*");
// Поверне лише записи цього майстра
```

### MVP-політики

Політики `mvp_*_authenticated_all` тимчасово дають повний доступ ролі `authenticated`.  
**Видаліть їх**, коли впровадите Supabase Auth з custom JWT claims.

### Service role

Ключ `SUPABASE_SERVICE_ROLE_KEY` обходить RLS — використовуйте **лише на сервері** (API routes, webhook, cron).

---

## Корисні запити для тестування

```sql
-- Встановити контекст майстра
SELECT public.set_telegram_context(123456789);

-- Перевірити поточного майстра
SELECT public.current_master_id();

-- Тестовий майстер
INSERT INTO public.masters (telegram_id, business_name, category)
VALUES (123456789, 'Тестова студія', 'beauty')
RETURNING *;

-- Тестова послуга
INSERT INTO public.services (master_id, name, price, duration_minutes)
SELECT id, 'Стрижка', 500, 60 FROM public.masters WHERE telegram_id = 123456789;
```

---

## Наступні кроки

- Supabase Storage bucket для `logo_url`
- Supabase Auth + custom claim `telegram_id` у JWT
- Видалення MVP-політик після auth
- Seed-дані для dev-середовища
